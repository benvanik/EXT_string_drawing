Very early project to write a low-level text run drawing extension to WebGL.
See the IDL for a definition/documentation about the API, then simply include
the js file to enable the extension.

    // Grab the extension for use
    var ext = gl.getExtension("EXT_string_drawing");

    // Create a character map with a specific font and add the basic ASCII
    // character set to it
    var map = ext.createCharacterMap({
        fontFamily: "Tahoma",
        fontSize: "10px"
    });
    ext.characterMapAppendSet(map, ext.CHARACTER_SET_ASCII);

    // Create a string object and set some properties on it
    var s0 = ext.createString(ext.DRAWN_STRING);
    ext.stringData(s0, map, "hello world!", gl.STATIC_DRAW);
    ext.stringColor(s0, 1.0, 0.0, 0.0, 1.0);
    ext.stringShadow(s0, 3.0, 3.0, 0.0, 0.0, 0.0);

    // Draw the string in the scene
    ...
    ext.drawString(s0, 100.0, 10.0); // x,y on the screen
    ext.drawString(s0, matrix, 0.0); // matrix and depth to write (if depth writing enabled)
    ...


    // Create a string object and program
    var s1 = ext.createString(ext.PAINTED_STRING);
    ext.stringData(s1, map, "hello world!", gl.STATIC_DRAW);
    var program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, ext.getStringFragmentShader());
    gl.linkProgram(program);

    // Draw the string painted on existing geometry
    ...
    ext.useString(s1, program);
    // draw geometry
    ...
