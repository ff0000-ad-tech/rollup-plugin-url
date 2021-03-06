'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var rollupPluginutils = require('rollup-pluginutils');
var mime = _interopDefault(require('mime'));
var crypto = _interopDefault(require('crypto'));
var path = _interopDefault(require('path'));
var fs = _interopDefault(require('fs'));

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var defaultInclude = ["**/*.svg", "**/*.png", "**/*.jpg", "**/*.gif"];

function url() {
  var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  var _options$limit = options.limit,
      limit = _options$limit === undefined ? 14 * 1024 : _options$limit,
      _options$include = options.include,
      include = _options$include === undefined ? defaultInclude : _options$include,
      exclude = options.exclude,
      _options$publicPath = options.publicPath,
      publicPath = _options$publicPath === undefined ? "" : _options$publicPath,
      _options$emitFiles = options.emitFiles,
      emitFiles = _options$emitFiles === undefined ? true : _options$emitFiles,
      _options$forImageMana = options.forImageManager,
      forImageManager = _options$forImageMana === undefined ? false : _options$forImageMana;

  var filter = rollupPluginutils.createFilter(include, exclude);

  var copies = Object.create(null);

  return {
    load: function load(id) {
      if (!filter(id)) {
        return null;
      }
      return Promise.all([promise(fs.stat, id), promise(fs.readFile, id)]).then(function (_ref) {
        var _ref2 = _slicedToArray(_ref, 2),
            stats = _ref2[0],
            buffer = _ref2[1];

        var data = void 0;
        if (forImageManager) {
          var parsedPath = path.parse(id);
          copies[id] = data = parsedPath.name;
        } else if (limit && stats.size > limit || limit === 0) {
          var hash = crypto.createHash("sha1").update(buffer).digest("hex").substr(0, 16);
          var filename = hash + path.extname(id);
          data = "" + publicPath + filename;
          copies[id] = filename;
        } else {
          var mimetype = mime.lookup(id);
          var isSVG = mimetype === "image/svg+xml";
          data = isSVG ? encodeSVG(buffer) : buffer.toString("base64");
          var encoding = isSVG ? "" : ";base64";
          data = "data:" + mimetype + encoding + "," + data;
        }
        return "export default \"" + data + "\"";
      });
    },

    onwrite: function write(options) {
      // Allow skipping saving files for server side builds.
      if (!emitFiles) return;

      var base = path.dirname(options.file);
      return Promise.all(Object.keys(copies).map(function (name) {
        var output = copies[name];
        return copy(name, path.join(base, output));
      }));
    }
  };
}

function promise(fn) {
  for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
    args[_key - 1] = arguments[_key];
  }

  return new Promise(function (resolve, reject) {
    return fn.apply(undefined, args.concat([function (err, res) {
      return err ? reject(err) : resolve(res);
    }]));
  });
}

function copy(src, dest) {
  return new Promise(function (resolve, reject) {
    var read = fs.createReadStream(src);
    read.on("error", reject);
    var write = fs.createWriteStream(dest);
    write.on("error", reject);
    write.on("finish", resolve);
    read.pipe(write);
  });
}

// https://github.com/filamentgroup/directory-encoder/blob/master/lib/svg-uri-encoder.js
function encodeSVG(buffer) {
  return encodeURIComponent(buffer.toString("utf-8")
  // strip newlines and tabs
  .replace(/[\n\r]/gmi, "").replace(/\t/gmi, " ")
  // strip comments
  .replace(/<!\-\-(.*(?=\-\->))\-\->/gmi, "")
  // replace
  .replace(/'/gmi, "\\i"))
  // encode brackets
  .replace(/\(/g, "%28").replace(/\)/g, "%29");
}

module.exports = url;
