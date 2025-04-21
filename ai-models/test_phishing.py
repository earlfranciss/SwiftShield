import pickle
import pandas as pd
import numpy as np
import sys
import os

# --- Configuration ---
# Adjust paths as needed. Assumes 'ai-models' is a sibling to the dir containing this script
# Or adjust relative paths if running from within ai-models folder
BASE_DIR = os.path.dirname(__file__) # Directory where this script resides
MODEL_PATH = os.path.join(BASE_DIR, 'phishing_classifier.pkl') # Assuming model is in the same folder
IMPUTER_PATH = os.path.join(BASE_DIR, 'imputer.pkl')           # Assuming imputer is here
SCALER_PATH = os.path.join(BASE_DIR, 'scaler.pkl')            # Assuming scaler is here
FEATURE_EXTRACTOR_MODULE = 'PhishingFeatureExtraction' # Name of your feature extraction file (without .py)

# --- Load Model, Feature Names, Imputer, and Scaler ---
print("--- Loading Components ---")
try:
    # Load Model and Feature Names
    with open(MODEL_PATH, 'rb') as f:
        loaded_data = pickle.load(f)
    loaded_model = loaded_data['model']
    expected_feature_names = loaded_data['feature_names']
    print(f"✅ Model loaded successfully from {MODEL_PATH}")
    print(f"ⓘ Model expects {len(expected_feature_names)} features in this order.")

    # Load Imputer
    if os.path.exists(IMPUTER_PATH):
        with open(IMPUTER_PATH, 'rb') as f:
            imputer = pickle.load(f) # Load the FITTED imputer
        print(f"✅ Imputer loaded from {IMPUTER_PATH}")
    else:
        imputer = None
        print(f"ℹ️ Imputer file not found at {IMPUTER_PATH}. Proceeding without imputation step.")

    # Load Scaler
    if os.path.exists(SCALER_PATH):
        with open(SCALER_PATH, 'rb') as f:
            scaler = pickle.load(f)   # Load the FITTED scaler
        print(f"✅ Scaler loaded from {SCALER_PATH}")
    else:
        scaler = None
        print(f"ℹ️ Scaler file not found at {SCALER_PATH}. Proceeding without scaling step.")

except FileNotFoundError as e:
    print(f"❌ ERROR: Required file not found: {e}")
    sys.exit(1)
except KeyError as e:
    print(f"❌ ERROR: Key missing in loaded pickle file. Missing key: {e}")
    sys.exit(1)
except Exception as e:
    print(f"❌ ERROR: Failed to load components: {e}")
    sys.exit(1)

# --- Import Feature Extractor ---
try:
    # Assumes PhishingFeatureExtraction.py is in the same directory or Python path
    module = __import__(FEATURE_EXTRACTOR_MODULE)
    FeatureExtraction = module.FeatureExtraction
    print(f"✅ FeatureExtraction class imported from {FEATURE_EXTRACTOR_MODULE}.py")
except ModuleNotFoundError:
    print(f"❌ ERROR: Cannot find the feature extractor file: {FEATURE_EXTRACTOR_MODULE}.py")
    print(f"   Make sure it's in the same directory as this script ({BASE_DIR}) or in Python's path.")
    sys.exit(1)
except AttributeError:
    print(f"❌ ERROR: Could not find 'FeatureExtraction' class inside {FEATURE_EXTRACTOR_MODULE}.py")
    sys.exit(1)
except Exception as e:
    print(f"❌ ERROR: Failed to import feature extractor: {e}")
    sys.exit(1)

# --- Main Testing Function ---
def test_url(url_to_test):
    if not url_to_test:
        print("⚠️ Please provide a URL.")
        return

    print(f"\n--- Testing URL: {url_to_test} ---")

    # 1. Instantiate Feature Extractor
    print("⏳ Initializing feature extraction (this involves network requests)...")
    try:
        extractor = FeatureExtraction(url_to_test)
    except Exception as e:
        print(f"❌ ERROR: Failed to initialize FeatureExtraction for '{url_to_test}': {e}")
        return

    # 2. Extract Features in the REQUIRED order
    print(f"⚙️ Extracting {len(expected_feature_names)} features in the required order...")
    features_list = extractor.getFeaturesList(expected_feature_names)
    print(f"📊 Extracted features list (length {len(features_list)}).")

    # --- DISPLAY EXTRACTED FEATURES --- START ---
    print("\n--- Extracted Feature Values (Raw) ---")
    nan_in_raw = False
    if len(features_list) == len(expected_feature_names):
        for i, feature_name in enumerate(expected_feature_names):
            value = features_list[i]
            status = ""
            # Use isinstance float check + np.isnan for robust NaN detection
            if isinstance(value, float) and np.isnan(value):
                 status = " (NaN detected!)"
                 nan_in_raw = True
            # Format floats nicely, handle others directly
            if isinstance(value, float):
                 formatted_value = f"{value:.4f}" if not np.isnan(value) else "NaN"
            else:
                 formatted_value = str(value)
            print(f"  {i+1:02d}. {feature_name:<30}: {formatted_value}{status}")
    else:
        print(f"❌ ERROR: Mismatch! Expected {len(expected_feature_names)} features, but extracted {len(features_list)}.")
        print(f"   Extracted list sample: {features_list[:10]}...")
        return # Stop processing if mismatch
    print("--- End of Raw Features ---")
    # --- DISPLAY EXTRACTED FEATURES --- END ---

    # 3. Convert to NumPy array (essential for transform)
    #    Needs to be 2D: (1 sample, N features)
    features_array = np.array([features_list])
    if features_array.shape[1] != len(expected_feature_names):
         print(f"❌ ERROR: Shape mismatch after converting to array. Expected {len(expected_feature_names)} features, got {features_array.shape[1]}.")
         return

    # 4. Apply Imputation (if imputer was loaded)
    features_processed = features_array # Start with the raw array
    if imputer:
        print("\n🔄 Applying NaN imputation using loaded imputer...")
        try:
            features_processed = imputer.transform(features_processed)
            if nan_in_raw: # Only mention imputation if NaNs were actually present
                 print("   NaNs detected and imputed via loaded imputer.")
            else:
                 print("   No NaNs detected in raw features, imputation applied formally.")
        except ValueError as ve:
            print(f"❌ ERROR during imputation: {ve}")
            print(f"   Ensure the number of features ({features_processed.shape[1]}) matches the imputer's expected features.")
            return
        except Exception as e:
            print(f"❌ ERROR during imputation: {e}")
            return
    elif nan_in_raw: # If no imputer loaded BUT NaNs were found
         print("\n⚠️ WARNING: NaNs detected in features, but no imputer was loaded. Model prediction might fail or be inaccurate.")
         # Optionally stop here if NaNs are unacceptable without imputation
         # return


    # 5. Apply Scaling (if scaler was loaded)
    if scaler:
        print("\n📏 Applying feature scaling using loaded scaler...")
        try:
            # Apply scaler to the (potentially imputed) data
            features_processed = scaler.transform(features_processed)
            print("   Scaling applied.")
        except ValueError as ve:
            print(f"❌ ERROR during scaling: {ve}")
            print(f"   Ensure the number of features ({features_processed.shape[1]}) matches the scaler's expected features.")
            return
        except Exception as e:
            print(f"❌ ERROR during scaling: {e}")
            return
    else:
        print("\nℹ️ No scaler loaded, proceeding with unscaled (but possibly imputed) features.")


    # 6. Make Prediction using the fully processed data
    print("\n🧠 Predicting...")
    try:
        # Ensure model gets the final processed array (imputed and/or scaled)
        prediction = loaded_model.predict(features_processed)
        probability = loaded_model.predict_proba(features_processed)

        predicted_class = prediction[0]
        phishing_prob = probability[0][1] # Probability of class '1'

        print("\n--- Prediction Result ---")
        if predicted_class == 1:
            print(f"🚨 Prediction: PHISHING (Class {predicted_class})")
        else:
            print(f"✅ Prediction: LEGITIMATE (Class {predicted_class})")
        print(f"   Confidence (Phishing Probability): {phishing_prob:.4f}")

    except ValueError as ve:
         print(f"❌ ERROR during prediction: {ve}")
         # This error now more likely indicates data type issues if feature counts matched before
         print(f"   Check data types after processing. Ensure model received numeric data.")
    except Exception as e:
        print(f"❌ ERROR: An unexpected error occurred during prediction: {e}")


# --- Get URL and Run Test ---
if __name__ == "__main__":
    if len(sys.argv) > 1:
        url = sys.argv[1]
    else:
        url = input("Enter the URL to test: ")
    test_url(url)