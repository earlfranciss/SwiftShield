import secrets

def generate_key():
    key = secrets.token_hex(32)
    print(f"Generated SECRET_KEY: {key}")

if __name__ == "__main__":
    generate_key()
