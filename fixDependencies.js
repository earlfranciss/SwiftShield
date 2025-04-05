const fs = require('fs');
const path = require('path');

const activityIndicatorPath = path.join(__dirname, 'node_modules/react-native/Libraries/Components/ActivityIndicator/ActivityIndicator.js');

try {
  console.log('Fixing ActivityIndicator.js...');
  let content = fs.readFileSync(activityIndicatorPath, 'utf8');
  
  // Check if the file contains the problematic code
  if (content.includes('const ActivityIndicatorWithRef: component(')) {
    // Replace the problematic lines
    content = content.replace(
      /const ActivityIndicatorWithRef: component\([^)]*\) = React\.forwardRef\(ActivityIndicator\);/s,
      'const ActivityIndicatorWithRef = React.forwardRef(ActivityIndicator);'
    );
    
    fs.writeFileSync(activityIndicatorPath, content);
    console.log('Successfully fixed ActivityIndicator.js');
  } else {
    console.log('No fix needed for ActivityIndicator.js');
  }
} catch (error) {
  console.error('Error fixing ActivityIndicator.js:', error);
}