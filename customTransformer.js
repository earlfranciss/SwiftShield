const metro = require('metro');
const { transform } = require('@babel/core');

module.exports.transform = async ({ src, filename, options }) => {
  // Apply fixes to problematic files
  if (filename.includes('node_modules/react-native/Libraries/Components/ActivityIndicator/ActivityIndicator.js')) {
    // Fix the specific syntax error
    src = src.replace(
      /const ActivityIndicatorWithRef: component\(/g,
      'const ActivityIndicatorWithRef = React.forwardRef(ActivityIndicator); // Auto-fixed by custom transformer\n/*'
    );
    src = src.replace(
      /\) = React\.forwardRef\(ActivityIndicator\);/g,
      ')*/'
    );
  }

  // Continue with normal transformation
  return metro.transformer.transform({ src, filename, options });
};