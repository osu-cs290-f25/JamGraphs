var templatePath = process.argv[2];
var outputPath = process.argv[3];
if(!templatePath || !outputPath) {
    console.error("Missing required arguments: templatePath or outputPath");
    process.exit(1);
}

var path = require('path');
var templateExt = path.extname(templatePath);
var templateName = path.basename(templatePath, templateExt);

var fs = require('fs');
var template = fs.readFileSync(templatePath, 'utf-8'); //ejs template

var ejs = require('ejs');
var templateFn = ejs.compile(
    template, 
    {client: true}
); //ejs to function in client

//initialize templates if needed
var output = "window.templates = window.templates || {};\n";
//add template function to output
output += "window.templates[\"" + templateName + "\"] = " + templateFn;

fs.writeFileSync(outputPath, output);

