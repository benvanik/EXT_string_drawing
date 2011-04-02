(function () {

    var ExtCharacterMap = function ExtCharacterMap(font) {
        this.font_ = {};
        for (var name in font) {
            var value = font[name];
            if (value && value.length) {
                this.font_[name] = value;
            }
        }
        // TODO: set defaults

        this.deleted_ = false;

        this.freeSlots_ = 0;
        this.chars_ = {};
    };

    var ExtString = function ExtString() {
    };

    var EXT_string_drawing = function EXT_string_drawing(gl) {
        this.gl = gl;

        this.errorMap_ = {};

        this.currentString_ = null;

        this.setupResources_();
    };

    EXT_string_drawing.prototype.CHARACTER_MAP_FONT_ATTRIBUTES = 0x119900;

    EXT_string_drawing.prototype.CHARACTER_SET_ASCII = 0x119910;

    EXT_string_drawing.prototype.PAINTED_STRING = 0x119920;
    EXT_string_drawing.prototype.DRAWN_STRING = 0x119921;

    EXT_string_drawing.prototype.STRING_TYPE = 0x119931;
    EXT_string_drawing.prototype.STRING_WIDTH = 0x119932;
    EXT_string_drawing.prototype.STRING_HEIGHT = 0x119933;
    EXT_string_drawing.prototype.STRING_COLOR = 0x119934;
    EXT_string_drawing.prototype.STRING_OUTLINE_WIDTH = 0x119935;
    EXT_string_drawing.prototype.STRING_GLOW_WIDTH = 0x119936;
    EXT_string_drawing.prototype.STRING_GLOW_COLOR = 0x119937;
    EXT_string_drawing.prototype.STRING_SHADOW_OFFSET = 0x119938;
    EXT_string_drawing.prototype.STRING_SHADOW_COLOR = 0x119939;



    EXT_string_drawing.prototype.setupResources_ = function setupResources_() {
        // TODO: initialize shaders/programs/etc
        this.fragmentSource_ = "";
        this.fragmentShader_ = null;
    };

    EXT_string_drawing.prototype.setError_ = function setError_(error) {
        console.log("error " + error);
        this.errorMap_[error] = true;
    };



    EXT_string_drawing.prototype.getStringFragmentSource = function getStringFragmentSource() {
        return this.fragmentSource_;
    };
    EXT_string_drawing.prototype.getStringFragmentShader = function getStringFragmentShader() {
        return this.fragmentShader_;
    };



    EXT_string_drawing.prototype.validateCharacterMap_ = function validateCharacterMap_(map) {
        var gl = this.gl;
        if (!map) {
            this.setError_(gl.INVALID_VALUE);
            return false;
        }
        if (!(map instanceof ExtCharacterMap)) {
            this.setError_(gl.INVALID_OPERATION);
            return false;
        }
        return true;
    };

    EXT_string_drawing.prototype.createCharacterMap = function createCharacterMap(font) {
        var gl = this.gl;
        var map = new ExtCharacterMap(font);
        // TODO: register
        return map;
    };
    EXT_string_drawing.prototype.deleteCharacterMap = function deleteCharacterMap(map) {
        var gl = this.gl;
        if (!this.validateCharacterMap_(map)) {
            return;
        }
        // TODO: unregister
    };
    EXT_string_drawing.prototype.isCharacterMap = function isCharacterMap(map) {
        return map && map instanceof ExtCharacterMap;
    };
    EXT_string_drawing.prototype.getCharacterMapParameter = function getCharacterMapParameter(map, pname) {
        var gl = this.gl;
        if (!this.validateCharacterMap_(map)) {
            return 0;
        }
        switch (pname) {
            case gl.DELETE_STATUS:
                return 0;
            case this.CHARACTER_MAP_FONT_ATTRIBUTES:
                return 0;
            default:
                this.setError_(gl.INVALID_ENUM);
                return 0;
        }
    };
    EXT_string_drawing.prototype.characterMapAppendCharacters = function characterMapAppendCharacters(map, chars) {
        var gl = this.gl;
        if (!this.validateCharacterMap_(map)) {
            return;
        }
    };
    EXT_string_drawing.prototype.characterMapAppendSet = function characterMapAppendSet(map, set) {
        var gl = this.gl;
        if (!this.validateCharacterMap_(map)) {
            return;
        }
    };
    EXT_string_drawing.prototype.measureString = function measureString(map, chars) {
        var gl = this.gl;
        if (!this.validateCharacterMap_(map)) {
            return;
        }
    };



    EXT_string_drawing.prototype.validateString_ = function validateString_(str) {
        var gl = this.gl;
        if (!str) {
            this.setError_(gl.INVALID_VALUE);
            return false;
        }
        if (!(str instanceof ExtString)) {
            this.setError_(gl.INVALID_OPERATION);
            return false;
        }
        return true;
    };

    EXT_string_drawing.prototype.createString = function createString(type) {
        var gl = this.gl;
        var str = new ExtString();
        // TODO: register
        return str;
    };
    EXT_string_drawing.prototype.deleteString = function deleteString(str) {
        var gl = this.gl;
        if (!this.validateString_(str)) {
            return;
        }
        // TODO: unregister
    };
    EXT_string_drawing.prototype.isString = function isString(str) {
        return str && str instanceof ExtString;
    };
    EXT_string_drawing.prototype.stringData = function stringData(str, map, chars, usage) {
        var gl = this.gl;
        if (!this.validateString_(str)) {
            return;
        }
    };
    EXT_string_drawing.prototype.stringColor = function stringColor(str, red, green, blue, alpha) {
        var gl = this.gl;
        if (!this.validateString_(str)) {
            return;
        }
    };
    EXT_string_drawing.prototype.stringOutline = function stringOutline(str, width) {
        var gl = this.gl;
        if (!this.validateString_(str)) {
            return;
        }
    };
    EXT_string_drawing.prototype.stringGlow = function stringGlow(str, width, red, green, blue) {
        var gl = this.gl;
        if (!this.validateString_(str)) {
            return;
        }
    };
    EXT_string_drawing.prototype.stringShadow = function stringShadow(str, offsetx, offsety, red, green, blue) {
        var gl = this.gl;
        if (!this.validateString_(str)) {
            return;
        }
    };
    EXT_string_drawing.prototype.getStringParameter = function getStringParameter(str, pname) {
        var gl = this.gl;
        if (!this.validateString_(str)) {
            return 0;
        }
        switch (pname) {
            case gl.DELETE_STATUS:
                return 0;
            case this.STRING_TYPE:
                return 0;
            case this.STRING_WIDTH:
                return 0;
            case this.STRING_HEIGHT:
                return 0;
            case this.STRING_COLOR:
                return 0;
            case this.STRING_OUTLINE_WIDTH:
                return 0;
            case this.STRING_GLOW_WIDTH:
                return 0;
            case this.STRING_GLOW_COLOR:
                return 0;
            case this.STRING_SHADOW_OFFSET:
                return 0;
            case this.STRING_SHADOW_COLOR:
                return 0;
            default:
                this.setError_(gl.INVALID_ENUM);
                return 0;
        }
    };



    EXT_string_drawing.prototype.drawString = function drawString(str) {
        //(ExtString str, Float32Array matrix, float z); // 4x4 world->ndc
        //(ExtString str, float x, float y);
        var gl = this.gl;
        if (!this.validateString_(str)) {
            return;
        }
    };

    EXT_string_drawing.prototype.useString = function useString(str, program) {
        var gl = this.gl;
        if (str === null) {
            // Clear CURRENT_STRING
            this.currentString_ = null;
            return;
        }
        if (!this.validateString_(str)) {
            return;
        }
        if (!gl.isProgram(program)) {
            this.setError_(gl.INVALID_OPERATION);
            return;
        }

        this.currentString_ = str;
        gl.useProgram(program);

        // ...
    };






    // Install the hooks onto the WebGLRenderingContext to support the extension query,
    // setting of custom errors, state queries, etc
    (function (proto) {

        // getSupportedExtensions: include extension in the enumeration
        var original_getSupportedExtensions = proto.getSupportedExtensions;
        proto.getSupportedExtensions = function getSupportedExtensions() {
            var list = original_getSupportedExtensions.call(this);
            list.push("EXT_string_drawing");
            return list;
        };

        // getExtension: allocate/return extension object
        var original_getExtension = proto.getExtension;
        proto.getExtension = function getExtension(name) {
            if (name === "EXT_string_drawing") {
                if (!this.EXT_string_drawing_) {
                    this.EXT_string_drawing_ = new EXT_string_drawing(this);
                }
                return this.EXT_string_drawing_;
            }
            return original_getExtension.call(this, name);
        };

        // getError: return errors that occurred on the extension
        var original_getError = proto.getError;
        proto.getError = function getError() {
            var ext = this.EXT_string_drawing_;
            if (ext) {
                var errorMap = ext.errorMap_;
                for (var error in errorMap) {
                    if (errorMap[error]) {
                        errorMap[error] = false;
                        return error;
                    }
                }
            }
            return original_getError.call(this);
        };

        // getParameter: support CURRENT_STRING
        var original_getParameter = proto.getParameter;
        proto.getParameter = function getParameter(pname) {
            var ext = this.EXT_string_drawing_;
            if (ext) {
                if (pname === ext.CURRENT_STRING) {
                    return ext.currentString_;
                }
            }
            return original_getParameter.call(this, pname);
        };

        // useProgram: reset CURRENT_STRING
        var original_useProgram = proto.useProgram;
        proto.useProgram = function useProgram(program) {
            var ext = this.EXT_string_drawing_;
            if (ext) {
                ext.currentString_ = null;
            }
            return original_useProgram.call(this, program);
        };

    })(WebGLRenderingContext.prototype);

})();
