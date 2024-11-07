var Module = typeof Module != "undefined" ? Module : {};
var ENVIRONMENT_IS_WEB = typeof window == "object";
var ENVIRONMENT_IS_WORKER = typeof importScripts == "function";
var ENVIRONMENT_IS_NODE = typeof process == "object" && typeof process.versions == "object" && typeof process.versions.node == "string" && process.type != "renderer";
if (ENVIRONMENT_IS_NODE) {}
var moduleOverrides = Object.assign({}, Module);
var arguments_ = [];
var thisProgram = "./this.program";
var quit_ = (status, toThrow) => {
    throw toThrow
}
;
var scriptDirectory = "";
function locateFile(path) {
    if (Module["locateFile"]) {
        return Module["locateFile"](path, scriptDirectory)
    }
    return scriptDirectory + path
}
var readAsync, readBinary;
if (ENVIRONMENT_IS_NODE) {
    var fs = require("fs");
    var nodePath = require("path");
    scriptDirectory = __dirname + "/";
    readBinary = filename => {
        filename = isFileURI(filename) ? new URL(filename) : nodePath.normalize(filename);
        var ret = fs.readFileSync(filename);
        return ret
    }
    ;
    readAsync = (filename, binary=true) => {
        filename = isFileURI(filename) ? new URL(filename) : nodePath.normalize(filename);
        return new Promise( (resolve, reject) => {
            fs.readFile(filename, binary ? undefined : "utf8", (err, data) => {
                if (err)
                    reject(err);
                else
                    resolve(binary ? data.buffer : data)
            }
            )
        }
        )
    }
    ;
    if (!Module["thisProgram"] && process.argv.length > 1) {
        thisProgram = process.argv[1].replace(/\\/g, "/")
    }
    arguments_ = process.argv.slice(2);
    if (typeof module != "undefined") {
        module["exports"] = Module
    }
    quit_ = (status, toThrow) => {
        process.exitCode = status;
        throw toThrow
    }
} else if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
    if (ENVIRONMENT_IS_WORKER) {
        scriptDirectory = self.location.href
    } else if (typeof document != "undefined" && document.currentScript) {
        scriptDirectory = document.currentScript.src
    }
    if (scriptDirectory.startsWith("blob:")) {
        scriptDirectory = ""
    } else {
        scriptDirectory = scriptDirectory.substr(0, scriptDirectory.replace(/[?#].*/, "").lastIndexOf("/") + 1)
    }
    {
        if (ENVIRONMENT_IS_WORKER) {
            readBinary = url => {
                var xhr = new XMLHttpRequest;
                xhr.open("GET", url, false);
                xhr.responseType = "arraybuffer";
                xhr.send(null);
                return new Uint8Array(xhr.response)
            }
        }
        readAsync = url => {
            if (isFileURI(url)) {
                return new Promise( (resolve, reject) => {
                    var xhr = new XMLHttpRequest;
                    xhr.open("GET", url, true);
                    xhr.responseType = "arraybuffer";
                    xhr.onload = () => {
                        if (xhr.status == 200 || xhr.status == 0 && xhr.response) {
                            resolve(xhr.response);
                            return
                        }
                        reject(xhr.status)
                    }
                    ;
                    xhr.onerror = reject;
                    xhr.send(null)
                }
                )
            }
            return fetch(url, {
                credentials: "same-origin"
            }).then(response => {
                if (response.ok) {
                    return response.arrayBuffer()
                }
                return Promise.reject(new Error(response.status + " : " + response.url))
            }
            )
        }
    }
} else {}
var out = Module["print"] || console.log.bind(console);
var err = Module["printErr"] || console.error.bind(console);
Object.assign(Module, moduleOverrides);
moduleOverrides = null;
if (Module["arguments"])
    arguments_ = Module["arguments"];
if (Module["thisProgram"])
    thisProgram = Module["thisProgram"];
var wasmBinary = Module["wasmBinary"];
var wasmMemory;
var ABORT = false;
var EXITSTATUS;
var HEAP8, HEAPU8, HEAP16, HEAPU16, HEAP32, HEAPU32, HEAPF32, HEAPF64;
function updateMemoryViews() {
    var b = wasmMemory.buffer;
    Module["HEAP8"] = HEAP8 = new Int8Array(b);
    Module["HEAP16"] = HEAP16 = new Int16Array(b);
    Module["HEAPU8"] = HEAPU8 = new Uint8Array(b);
    Module["HEAPU16"] = HEAPU16 = new Uint16Array(b);
    Module["HEAP32"] = HEAP32 = new Int32Array(b);
    Module["HEAPU32"] = HEAPU32 = new Uint32Array(b);
    Module["HEAPF32"] = HEAPF32 = new Float32Array(b);
    Module["HEAPF64"] = HEAPF64 = new Float64Array(b)
}
var __ATPRERUN__ = [];
var __ATINIT__ = [];
var __ATMAIN__ = [];
var __ATPOSTRUN__ = [];
var runtimeInitialized = false;
function preRun() {
    var preRuns = Module["preRun"];
    if (preRuns) {
        if (typeof preRuns == "function")
            preRuns = [preRuns];
        preRuns.forEach(addOnPreRun)
    }
    callRuntimeCallbacks(__ATPRERUN__)
}
function initRuntime() {
    runtimeInitialized = true;
    callRuntimeCallbacks(__ATINIT__)
}
function preMain() {
    callRuntimeCallbacks(__ATMAIN__)
}
function postRun() {
    var postRuns = Module["postRun"];
    if (postRuns) {
        if (typeof postRuns == "function")
            postRuns = [postRuns];
        postRuns.forEach(addOnPostRun)
    }
    callRuntimeCallbacks(__ATPOSTRUN__)
}
function addOnPreRun(cb) {
    __ATPRERUN__.unshift(cb)
}
function addOnInit(cb) {
    __ATINIT__.unshift(cb)
}
function addOnPostRun(cb) {
    __ATPOSTRUN__.unshift(cb)
}
var runDependencies = 0;
var runDependencyWatcher = null;
var dependenciesFulfilled = null;
function addRunDependency(id) {
    runDependencies++;
    Module["monitorRunDependencies"]?.(runDependencies)
}
function removeRunDependency(id) {
    runDependencies--;
    Module["monitorRunDependencies"]?.(runDependencies);
    if (runDependencies == 0) {
        if (runDependencyWatcher !== null) {
            clearInterval(runDependencyWatcher);
            runDependencyWatcher = null
        }
        if (dependenciesFulfilled) {
            var callback = dependenciesFulfilled;
            dependenciesFulfilled = null;
            callback()
        }
    }
}
function abort(what) {
    Module["onAbort"]?.(what);
    what = "Aborted(" + what + ")";
    err(what);
    ABORT = true;
    what += ". Build with -sASSERTIONS for more info.";
    var e = new WebAssembly.RuntimeError(what);
    throw e
}
var dataURIPrefix = "data:application/octet-stream;base64,";
var isDataURI = filename => filename.startsWith(dataURIPrefix);
var isFileURI = filename => filename.startsWith("file://");
function findWasmBinary() {
    var f = "ai.wasm";
    if (!isDataURI(f)) {
        return locateFile(f)
    }
    return f
}
var wasmBinaryFile;
function getBinarySync(file) {
    if (file == wasmBinaryFile && wasmBinary) {
        return new Uint8Array(wasmBinary)
    }
    if (readBinary) {
        return readBinary(file)
    }
    throw "both async and sync fetching of the wasm failed"
}
function getBinaryPromise(binaryFile) {
    if (!wasmBinary) {
        return readAsync(binaryFile).then(response => new Uint8Array(response), () => getBinarySync(binaryFile))
    }
    return Promise.resolve().then( () => getBinarySync(binaryFile))
}
function instantiateArrayBuffer(binaryFile, imports, receiver) {
    return getBinaryPromise(binaryFile).then(binary => WebAssembly.instantiate(binary, imports)).then(receiver, reason => {
        err(`failed to asynchronously prepare wasm: ${reason}`);
        abort(reason)
    }
    )
}
function instantiateAsync(binary, binaryFile, imports, callback) {
    if (!binary && typeof WebAssembly.instantiateStreaming == "function" && !isDataURI(binaryFile) && !isFileURI(binaryFile) && !ENVIRONMENT_IS_NODE && typeof fetch == "function") {
        return fetch(binaryFile, {
            credentials: "same-origin"
        }).then(response => {
            var result = WebAssembly.instantiateStreaming(response, imports);
            return result.then(callback, function(reason) {
                err(`wasm streaming compile failed: ${reason}`);
                err("falling back to ArrayBuffer instantiation");
                return instantiateArrayBuffer(binaryFile, imports, callback)
            })
        }
        )
    }
    return instantiateArrayBuffer(binaryFile, imports, callback)
}
function getWasmImports() {
    return {
        a: wasmImports
    }
}
function createWasm() {
    var info = getWasmImports();
    function receiveInstance(instance, module) {
        wasmExports = instance.exports;
        wasmMemory = wasmExports["u"];
        updateMemoryViews();
        addOnInit(wasmExports["v"]);
        removeRunDependency("wasm-instantiate");
        return wasmExports
    }
    addRunDependency("wasm-instantiate");
    function receiveInstantiationResult(result) {
        receiveInstance(result["instance"])
    }
    if (Module["instantiateWasm"]) {
        try {
            return Module["instantiateWasm"](info, receiveInstance)
        } catch (e) {
            err(`Module.instantiateWasm callback failed with error: ${e}`);
            return false
        }
    }
    wasmBinaryFile ??= findWasmBinary();
    instantiateAsync(wasmBinary, wasmBinaryFile, info, receiveInstantiationResult);
    return {}
}
function ExitStatus(status) {
    this.name = "ExitStatus";
    this.message = `Program terminated with exit(${status})`;
    this.status = status
}
var callRuntimeCallbacks = callbacks => {
    callbacks.forEach(f => f(Module))
}
;
var noExitRuntime = Module["noExitRuntime"] || true;
var __abort_js = () => {
    abort("")
}
;
var __embind_register_bigint = (primitiveType, name, size, minRange, maxRange) => {}
;
var embind_init_charCodes = () => {
    var codes = new Array(256);
    for (var i = 0; i < 256; ++i) {
        codes[i] = String.fromCharCode(i)
    }
    embind_charCodes = codes
}
;
var embind_charCodes;
var readLatin1String = ptr => {
    var ret = "";
    var c = ptr;
    while (HEAPU8[c]) {
        ret += embind_charCodes[HEAPU8[c++]]
    }
    return ret
}
;
var awaitingDependencies = {};
var registeredTypes = {};
var typeDependencies = {};
var BindingError;
var throwBindingError = message => {
    throw new BindingError(message)
}
;
var InternalError;
function sharedRegisterType(rawType, registeredInstance, options={}) {
    var name = registeredInstance.name;
    if (!rawType) {
        throwBindingError(`type "${name}" must have a positive integer typeid pointer`)
    }
    if (registeredTypes.hasOwnProperty(rawType)) {
        if (options.ignoreDuplicateRegistrations) {
            return
        } else {
            throwBindingError(`Cannot register type '${name}' twice`)
        }
    }
    registeredTypes[rawType] = registeredInstance;
    delete typeDependencies[rawType];
    if (awaitingDependencies.hasOwnProperty(rawType)) {
        var callbacks = awaitingDependencies[rawType];
        delete awaitingDependencies[rawType];
        callbacks.forEach(cb => cb())
    }
}
function registerType(rawType, registeredInstance, options={}) {
    return sharedRegisterType(rawType, registeredInstance, options)
}
var GenericWireTypeSize = 8;
var __embind_register_bool = (rawType, name, trueValue, falseValue) => {
    name = readLatin1String(name);
    registerType(rawType, {
        name,
        fromWireType: function(wt) {
            return !!wt
        },
        toWireType: function(destructors, o) {
            return o ? trueValue : falseValue
        },
        argPackAdvance: GenericWireTypeSize,
        readValueFromPointer: function(pointer) {
            return this["fromWireType"](HEAPU8[pointer])
        },
        destructorFunction: null
    })
}
;
var emval_freelist = [];
var emval_handles = [];
var __emval_decref = handle => {
    if (handle > 9 && 0 === --emval_handles[handle + 1]) {
        emval_handles[handle] = undefined;
        emval_freelist.push(handle)
    }
}
;
var count_emval_handles = () => emval_handles.length / 2 - 5 - emval_freelist.length;
var init_emval = () => {
    emval_handles.push(0, 1, undefined, 1, null, 1, true, 1, false, 1);
    Module["count_emval_handles"] = count_emval_handles
}
;
var Emval = {
    toValue: handle => {
        if (!handle) {
            throwBindingError("Cannot use deleted val. handle = " + handle)
        }
        return emval_handles[handle]
    }
    ,
    toHandle: value => {
        switch (value) {
        case undefined:
            return 2;
        case null:
            return 4;
        case true:
            return 6;
        case false:
            return 8;
        default:
            {
                const handle = emval_freelist.pop() || emval_handles.length;
                emval_handles[handle] = value;
                emval_handles[handle + 1] = 1;
                return handle
            }
        }
    }
};
function readPointer(pointer) {
    return this["fromWireType"](HEAPU32[pointer >> 2])
}
var EmValType = {
    name: "emscripten::val",
    fromWireType: handle => {
        var rv = Emval.toValue(handle);
        __emval_decref(handle);
        return rv
    }
    ,
    toWireType: (destructors, value) => Emval.toHandle(value),
    argPackAdvance: GenericWireTypeSize,
    readValueFromPointer: readPointer,
    destructorFunction: null
};
var __embind_register_emval = rawType => registerType(rawType, EmValType);
var floatReadValueFromPointer = (name, width) => {
    switch (width) {
    case 4:
        return function(pointer) {
            return this["fromWireType"](HEAPF32[pointer >> 2])
        }
        ;
    case 8:
        return function(pointer) {
            return this["fromWireType"](HEAPF64[pointer >> 3])
        }
        ;
    default:
        throw new TypeError(`invalid float width (${width}): ${name}`)
    }
}
;
var __embind_register_float = (rawType, name, size) => {
    name = readLatin1String(name);
    registerType(rawType, {
        name,
        fromWireType: value => value,
        toWireType: (destructors, value) => value,
        argPackAdvance: GenericWireTypeSize,
        readValueFromPointer: floatReadValueFromPointer(name, size),
        destructorFunction: null
    })
}
;
var integerReadValueFromPointer = (name, width, signed) => {
    switch (width) {
    case 1:
        return signed ? pointer => HEAP8[pointer] : pointer => HEAPU8[pointer];
    case 2:
        return signed ? pointer => HEAP16[pointer >> 1] : pointer => HEAPU16[pointer >> 1];
    case 4:
        return signed ? pointer => HEAP32[pointer >> 2] : pointer => HEAPU32[pointer >> 2];
    default:
        throw new TypeError(`invalid integer width (${width}): ${name}`)
    }
}
;
var __embind_register_integer = (primitiveType, name, size, minRange, maxRange) => {
    name = readLatin1String(name);
    if (maxRange === -1) {
        maxRange = 4294967295
    }
    var fromWireType = value => value;
    if (minRange === 0) {
        var bitshift = 32 - 8 * size;
        fromWireType = value => value << bitshift >>> bitshift
    }
    var isUnsignedType = name.includes("unsigned");
    var checkAssertions = (value, toTypeName) => {}
    ;
    var toWireType;
    if (isUnsignedType) {
        toWireType = function(destructors, value) {
            checkAssertions(value, this.name);
            return value >>> 0
        }
    } else {
        toWireType = function(destructors, value) {
            checkAssertions(value, this.name);
            return value
        }
    }
    registerType(primitiveType, {
        name,
        fromWireType,
        toWireType,
        argPackAdvance: GenericWireTypeSize,
        readValueFromPointer: integerReadValueFromPointer(name, size, minRange !== 0),
        destructorFunction: null
    })
}
;
var __embind_register_memory_view = (rawType, dataTypeIndex, name) => {
    var typeMapping = [Int8Array, Uint8Array, Int16Array, Uint16Array, Int32Array, Uint32Array, Float32Array, Float64Array];
    var TA = typeMapping[dataTypeIndex];
    function decodeMemoryView(handle) {
        var size = HEAPU32[handle >> 2];
        var data = HEAPU32[handle + 4 >> 2];
        return new TA(HEAP8.buffer,data,size)
    }
    name = readLatin1String(name);
    registerType(rawType, {
        name,
        fromWireType: decodeMemoryView,
        argPackAdvance: GenericWireTypeSize,
        readValueFromPointer: decodeMemoryView
    }, {
        ignoreDuplicateRegistrations: true
    })
}
;
var stringToUTF8Array = (str, heap, outIdx, maxBytesToWrite) => {
    if (!(maxBytesToWrite > 0))
        return 0;
    var startIdx = outIdx;
    var endIdx = outIdx + maxBytesToWrite - 1;
    for (var i = 0; i < str.length; ++i) {
        var u = str.charCodeAt(i);
        if (u >= 55296 && u <= 57343) {
            var u1 = str.charCodeAt(++i);
            u = 65536 + ((u & 1023) << 10) | u1 & 1023
        }
        if (u <= 127) {
            if (outIdx >= endIdx)
                break;
            heap[outIdx++] = u
        } else if (u <= 2047) {
            if (outIdx + 1 >= endIdx)
                break;
            heap[outIdx++] = 192 | u >> 6;
            heap[outIdx++] = 128 | u & 63
        } else if (u <= 65535) {
            if (outIdx + 2 >= endIdx)
                break;
            heap[outIdx++] = 224 | u >> 12;
            heap[outIdx++] = 128 | u >> 6 & 63;
            heap[outIdx++] = 128 | u & 63
        } else {
            if (outIdx + 3 >= endIdx)
                break;
            heap[outIdx++] = 240 | u >> 18;
            heap[outIdx++] = 128 | u >> 12 & 63;
            heap[outIdx++] = 128 | u >> 6 & 63;
            heap[outIdx++] = 128 | u & 63
        }
    }
    heap[outIdx] = 0;
    return outIdx - startIdx
}
;
var stringToUTF8 = (str, outPtr, maxBytesToWrite) => stringToUTF8Array(str, HEAPU8, outPtr, maxBytesToWrite);
var lengthBytesUTF8 = str => {
    var len = 0;
    for (var i = 0; i < str.length; ++i) {
        var c = str.charCodeAt(i);
        if (c <= 127) {
            len++
        } else if (c <= 2047) {
            len += 2
        } else if (c >= 55296 && c <= 57343) {
            len += 4;
            ++i
        } else {
            len += 3
        }
    }
    return len
}
;
var UTF8Decoder = typeof TextDecoder != "undefined" ? new TextDecoder : undefined;
var UTF8ArrayToString = (heapOrArray, idx=0, maxBytesToRead=NaN) => {
    var endIdx = idx + maxBytesToRead;
    var endPtr = idx;
    while (heapOrArray[endPtr] && !(endPtr >= endIdx))
        ++endPtr;
    if (endPtr - idx > 16 && heapOrArray.buffer && UTF8Decoder) {
        return UTF8Decoder.decode(heapOrArray.subarray(idx, endPtr))
    }
    var str = "";
    while (idx < endPtr) {
        var u0 = heapOrArray[idx++];
        if (!(u0 & 128)) {
            str += String.fromCharCode(u0);
            continue
        }
        var u1 = heapOrArray[idx++] & 63;
        if ((u0 & 224) == 192) {
            str += String.fromCharCode((u0 & 31) << 6 | u1);
            continue
        }
        var u2 = heapOrArray[idx++] & 63;
        if ((u0 & 240) == 224) {
            u0 = (u0 & 15) << 12 | u1 << 6 | u2
        } else {
            u0 = (u0 & 7) << 18 | u1 << 12 | u2 << 6 | heapOrArray[idx++] & 63
        }
        if (u0 < 65536) {
            str += String.fromCharCode(u0)
        } else {
            var ch = u0 - 65536;
            str += String.fromCharCode(55296 | ch >> 10, 56320 | ch & 1023)
        }
    }
    return str
}
;
var UTF8ToString = (ptr, maxBytesToRead) => ptr ? UTF8ArrayToString(HEAPU8, ptr, maxBytesToRead) : "";
var __embind_register_std_string = (rawType, name) => {
    name = readLatin1String(name);
    var stdStringIsUTF8 = name === "std::string";
    registerType(rawType, {
        name,
        fromWireType(value) {
            var length = HEAPU32[value >> 2];
            var payload = value + 4;
            var str;
            if (stdStringIsUTF8) {
                var decodeStartPtr = payload;
                for (var i = 0; i <= length; ++i) {
                    var currentBytePtr = payload + i;
                    if (i == length || HEAPU8[currentBytePtr] == 0) {
                        var maxRead = currentBytePtr - decodeStartPtr;
                        var stringSegment = UTF8ToString(decodeStartPtr, maxRead);
                        if (str === undefined) {
                            str = stringSegment
                        } else {
                            str += String.fromCharCode(0);
                            str += stringSegment
                        }
                        decodeStartPtr = currentBytePtr + 1
                    }
                }
            } else {
                var a = new Array(length);
                for (var i = 0; i < length; ++i) {
                    a[i] = String.fromCharCode(HEAPU8[payload + i])
                }
                str = a.join("")
            }
            _free(value);
            return str
        },
        toWireType(destructors, value) {
            if (value instanceof ArrayBuffer) {
                value = new Uint8Array(value)
            }
            var length;
            var valueIsOfTypeString = typeof value == "string";
            if (!(valueIsOfTypeString || value instanceof Uint8Array || value instanceof Uint8ClampedArray || value instanceof Int8Array)) {
                throwBindingError("Cannot pass non-string to std::string")
            }
            if (stdStringIsUTF8 && valueIsOfTypeString) {
                length = lengthBytesUTF8(value)
            } else {
                length = value.length
            }
            var base = _malloc(4 + length + 1);
            var ptr = base + 4;
            HEAPU32[base >> 2] = length;
            if (stdStringIsUTF8 && valueIsOfTypeString) {
                stringToUTF8(value, ptr, length + 1)
            } else {
                if (valueIsOfTypeString) {
                    for (var i = 0; i < length; ++i) {
                        var charCode = value.charCodeAt(i);
                        if (charCode > 255) {
                            _free(ptr);
                            throwBindingError("String has UTF-16 code units that do not fit in 8 bits")
                        }
                        HEAPU8[ptr + i] = charCode
                    }
                } else {
                    for (var i = 0; i < length; ++i) {
                        HEAPU8[ptr + i] = value[i]
                    }
                }
            }
            if (destructors !== null) {
                destructors.push(_free, base)
            }
            return base
        },
        argPackAdvance: GenericWireTypeSize,
        readValueFromPointer: readPointer,
        destructorFunction(ptr) {
            _free(ptr)
        }
    })
}
;
var UTF16Decoder = typeof TextDecoder != "undefined" ? new TextDecoder("utf-16le") : undefined;
var UTF16ToString = (ptr, maxBytesToRead) => {
    var endPtr = ptr;
    var idx = endPtr >> 1;
    var maxIdx = idx + maxBytesToRead / 2;
    while (!(idx >= maxIdx) && HEAPU16[idx])
        ++idx;
    endPtr = idx << 1;
    if (endPtr - ptr > 32 && UTF16Decoder)
        return UTF16Decoder.decode(HEAPU8.subarray(ptr, endPtr));
    var str = "";
    for (var i = 0; !(i >= maxBytesToRead / 2); ++i) {
        var codeUnit = HEAP16[ptr + i * 2 >> 1];
        if (codeUnit == 0)
            break;
        str += String.fromCharCode(codeUnit)
    }
    return str
}
;
var stringToUTF16 = (str, outPtr, maxBytesToWrite) => {
    maxBytesToWrite ??= 2147483647;
    if (maxBytesToWrite < 2)
        return 0;
    maxBytesToWrite -= 2;
    var startPtr = outPtr;
    var numCharsToWrite = maxBytesToWrite < str.length * 2 ? maxBytesToWrite / 2 : str.length;
    for (var i = 0; i < numCharsToWrite; ++i) {
        var codeUnit = str.charCodeAt(i);
        HEAP16[outPtr >> 1] = codeUnit;
        outPtr += 2
    }
    HEAP16[outPtr >> 1] = 0;
    return outPtr - startPtr
}
;
var lengthBytesUTF16 = str => str.length * 2;
var UTF32ToString = (ptr, maxBytesToRead) => {
    var i = 0;
    var str = "";
    while (!(i >= maxBytesToRead / 4)) {
        var utf32 = HEAP32[ptr + i * 4 >> 2];
        if (utf32 == 0)
            break;
        ++i;
        if (utf32 >= 65536) {
            var ch = utf32 - 65536;
            str += String.fromCharCode(55296 | ch >> 10, 56320 | ch & 1023)
        } else {
            str += String.fromCharCode(utf32)
        }
    }
    return str
}
;
var stringToUTF32 = (str, outPtr, maxBytesToWrite) => {
    maxBytesToWrite ??= 2147483647;
    if (maxBytesToWrite < 4)
        return 0;
    var startPtr = outPtr;
    var endPtr = startPtr + maxBytesToWrite - 4;
    for (var i = 0; i < str.length; ++i) {
        var codeUnit = str.charCodeAt(i);
        if (codeUnit >= 55296 && codeUnit <= 57343) {
            var trailSurrogate = str.charCodeAt(++i);
            codeUnit = 65536 + ((codeUnit & 1023) << 10) | trailSurrogate & 1023
        }
        HEAP32[outPtr >> 2] = codeUnit;
        outPtr += 4;
        if (outPtr + 4 > endPtr)
            break
    }
    HEAP32[outPtr >> 2] = 0;
    return outPtr - startPtr
}
;
var lengthBytesUTF32 = str => {
    var len = 0;
    for (var i = 0; i < str.length; ++i) {
        var codeUnit = str.charCodeAt(i);
        if (codeUnit >= 55296 && codeUnit <= 57343)
            ++i;
        len += 4
    }
    return len
}
;
var __embind_register_std_wstring = (rawType, charSize, name) => {
    name = readLatin1String(name);
    var decodeString, encodeString, readCharAt, lengthBytesUTF;
    if (charSize === 2) {
        decodeString = UTF16ToString;
        encodeString = stringToUTF16;
        lengthBytesUTF = lengthBytesUTF16;
        readCharAt = pointer => HEAPU16[pointer >> 1]
    } else if (charSize === 4) {
        decodeString = UTF32ToString;
        encodeString = stringToUTF32;
        lengthBytesUTF = lengthBytesUTF32;
        readCharAt = pointer => HEAPU32[pointer >> 2]
    }
    registerType(rawType, {
        name,
        fromWireType: value => {
            var length = HEAPU32[value >> 2];
            var str;
            var decodeStartPtr = value + 4;
            for (var i = 0; i <= length; ++i) {
                var currentBytePtr = value + 4 + i * charSize;
                if (i == length || readCharAt(currentBytePtr) == 0) {
                    var maxReadBytes = currentBytePtr - decodeStartPtr;
                    var stringSegment = decodeString(decodeStartPtr, maxReadBytes);
                    if (str === undefined) {
                        str = stringSegment
                    } else {
                        str += String.fromCharCode(0);
                        str += stringSegment
                    }
                    decodeStartPtr = currentBytePtr + charSize
                }
            }
            _free(value);
            return str
        }
        ,
        toWireType: (destructors, value) => {
            if (!(typeof value == "string")) {
                throwBindingError(`Cannot pass non-string to C++ string type ${name}`)
            }
            var length = lengthBytesUTF(value);
            var ptr = _malloc(4 + length + charSize);
            HEAPU32[ptr >> 2] = length / charSize;
            encodeString(value, ptr + 4, length + charSize);
            if (destructors !== null) {
                destructors.push(_free, ptr)
            }
            return ptr
        }
        ,
        argPackAdvance: GenericWireTypeSize,
        readValueFromPointer: readPointer,
        destructorFunction(ptr) {
            _free(ptr)
        }
    })
}
;
var __embind_register_void = (rawType, name) => {
    name = readLatin1String(name);
    registerType(rawType, {
        isVoid: true,
        name,
        argPackAdvance: 0,
        fromWireType: () => undefined,
        toWireType: (destructors, o) => undefined
    })
}
;
var nowIsMonotonic = 1;
var __emscripten_get_now_is_monotonic = () => nowIsMonotonic;
var getTypeName = type => {
    var ptr = ___getTypeName(type);
    var rv = readLatin1String(ptr);
    _free(ptr);
    return rv
}
;
var requireRegisteredType = (rawType, humanName) => {
    var impl = registeredTypes[rawType];
    if (undefined === impl) {
        throwBindingError(`${humanName} has unknown type ${getTypeName(rawType)}`)
    }
    return impl
}
;
var emval_returnValue = (returnType, destructorsRef, handle) => {
    var destructors = [];
    var result = returnType["toWireType"](destructors, handle);
    if (destructors.length) {
        HEAPU32[destructorsRef >> 2] = Emval.toHandle(destructors)
    }
    return result
}
;
var __emval_as = (handle, returnType, destructorsRef) => {
    handle = Emval.toValue(handle);
    returnType = requireRegisteredType(returnType, "emval::as");
    return emval_returnValue(returnType, destructorsRef, handle)
}
;
var emval_symbols = {};
var getStringOrSymbol = address => {
    var symbol = emval_symbols[address];
    if (symbol === undefined) {
        return readLatin1String(address)
    }
    return symbol
}
;
var emval_get_global = () => {
    if (typeof globalThis == "object") {
        return globalThis
    }
    return function() {
        return Function
    }()("return this")()
}
;
var __emval_get_global = name => {
    if (name === 0) {
        return Emval.toHandle(emval_get_global())
    } else {
        name = getStringOrSymbol(name);
        return Emval.toHandle(emval_get_global()[name])
    }
}
;
var __emval_get_property = (handle, key) => {
    handle = Emval.toValue(handle);
    key = Emval.toValue(key);
    return Emval.toHandle(handle[key])
}
;
var runDestructors = destructors => {
    while (destructors.length) {
        var ptr = destructors.pop();
        var del = destructors.pop();
        del(ptr)
    }
}
;
var __emval_run_destructors = handle => {
    var destructors = Emval.toValue(handle);
    runDestructors(destructors);
    __emval_decref(handle)
}
;
var __emval_take_value = (type, arg) => {
    type = requireRegisteredType(type, "_emval_take_value");
    var v = type["readValueFromPointer"](arg);
    return Emval.toHandle(v)
}
;
var _emscripten_get_now = () => performance.now();
var abortOnCannotGrowMemory = requestedSize => {
    abort("OOM")
}
;
var _emscripten_resize_heap = requestedSize => {
    var oldSize = HEAPU8.length;
    requestedSize >>>= 0;
    abortOnCannotGrowMemory(requestedSize)
}
;
var _emscripten_run_script = ptr => {
    eval(UTF8ToString(ptr))
}
;
var runtimeKeepaliveCounter = 0;
var keepRuntimeAlive = () => noExitRuntime || runtimeKeepaliveCounter > 0;
var _proc_exit = code => {
    EXITSTATUS = code;
    if (!keepRuntimeAlive()) {
        Module["onExit"]?.(code);
        ABORT = true
    }
    quit_(code, new ExitStatus(code))
}
;
var exitJS = (status, implicit) => {
    EXITSTATUS = status;
    _proc_exit(status)
}
;
var handleException = e => {
    if (e instanceof ExitStatus || e == "unwind") {
        return EXITSTATUS
    }
    quit_(1, e)
}
;
embind_init_charCodes();
BindingError = Module["BindingError"] = class BindingError extends Error {
    constructor(message) {
        super(message);
        this.name = "BindingError"
    }
}
;
InternalError = Module["InternalError"] = class InternalError extends Error {
    constructor(message) {
        super(message);
        this.name = "InternalError"
    }
}
;
init_emval();
var wasmImports = {
    r: __abort_js,
    n: __embind_register_bigint,
    p: __embind_register_bool,
    o: __embind_register_emval,
    e: __embind_register_float,
    b: __embind_register_integer,
    a: __embind_register_memory_view,
    d: __embind_register_std_string,
    c: __embind_register_std_wstring,
    q: __embind_register_void,
    g: __emscripten_get_now_is_monotonic,
    l: __emval_as,
    k: __emval_decref,
    s: __emval_get_global,
    m: __emval_get_property,
    i: __emval_run_destructors,
    j: __emval_take_value,
    f: _emscripten_get_now,
    h: _emscripten_resize_heap,
    t: _emscripten_run_script
};
var wasmExports = createWasm();
var ___wasm_call_ctors = () => (___wasm_call_ctors = wasmExports["v"])();
var _jsWork = Module["_jsWork"] = (a0, a1, a2, a3, a4) => (_jsWork = Module["_jsWork"] = wasmExports["w"])(a0, a1, a2, a3, a4);
var _malloc = a0 => (_malloc = wasmExports["x"])(a0);
var _main = Module["_main"] = (a0, a1) => (_main = Module["_main"] = wasmExports["y"])(a0, a1);
var ___getTypeName = a0 => (___getTypeName = wasmExports["A"])(a0);
var _free = a0 => (_free = wasmExports["B"])(a0);
var calledRun;
var calledPrerun;
dependenciesFulfilled = function runCaller() {
    if (!calledRun)
        run();
    if (!calledRun)
        dependenciesFulfilled = runCaller
}
;
function callMain() {
    var entryFunction = _main;
    var argc = 0;
    var argv = 0;
    try {
        var ret = entryFunction(argc, argv);
        exitJS(ret, true);
        return ret
    } catch (e) {
        return handleException(e)
    }
}
function run() {
    if (runDependencies > 0) {
        return
    }
    if (!calledPrerun) {
        calledPrerun = 1;
        preRun();
        if (runDependencies > 0) {
            return
        }
    }
    function doRun() {
        if (calledRun)
            return;
        calledRun = 1;
        Module["calledRun"] = 1;
        if (ABORT)
            return;
        initRuntime();
        preMain();
        Module["onRuntimeInitialized"]?.();
        if (shouldRunNow)
            callMain();
        postRun()
    }
    if (Module["setStatus"]) {
        Module["setStatus"]("Running...");
        setTimeout( () => {
            setTimeout( () => Module["setStatus"](""), 1);
            doRun()
        }
        , 1)
    } else {
        doRun()
    }
}
if (Module["preInit"]) {
    if (typeof Module["preInit"] == "function")
        Module["preInit"] = [Module["preInit"]];
    while (Module["preInit"].length > 0) {
        Module["preInit"].pop()()
    }
}
var shouldRunNow = true;
if (Module["noInitialRun"])
    shouldRunNow = false;
run();