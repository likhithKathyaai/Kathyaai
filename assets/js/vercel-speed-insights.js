/**
 * Vercel Speed Insights for WordPress
 * Modified for WordPress theme compatibility
 * Based on @vercel/speed-insights v1.3.1
 */
(function(window) {
  'use strict';

  // package.json
  var name = "@vercel/speed-insights";
  var version = "1.3.1";

  // src/queue.ts
  var initQueue = function() {
    if (window.si) return;
    window.si = function a() {
      var params = Array.prototype.slice.call(arguments);
      (window.siq = window.siq || []).push(params);
    };
  };

  // src/utils.ts
  function isBrowser() {
    return typeof window !== "undefined";
  }

  function detectEnvironment() {
    try {
      var env = typeof process !== 'undefined' && process.env && process.env.NODE_ENV;
      if (env === "development" || env === "test") {
        return "development";
      }
    } catch (e) {
    }
    return "production";
  }

  function isDevelopment() {
    return detectEnvironment() === "development";
  }

  function computeRoute(pathname, pathParams) {
    if (!pathname || !pathParams) {
      return pathname;
    }
    var result = pathname;
    try {
      var entries = Object.entries(pathParams);
      for (var i = 0; i < entries.length; i++) {
        var key = entries[i][0];
        var value = entries[i][1];
        if (!Array.isArray(value)) {
          var matcher = turnValueToRegExp(value);
          if (matcher.test(result)) {
            result = result.replace(matcher, "/[" + key + "]");
          }
        }
      }
      for (var j = 0; j < entries.length; j++) {
        var key2 = entries[j][0];
        var value2 = entries[j][1];
        if (Array.isArray(value2)) {
          var matcher2 = turnValueToRegExp(value2.join("/"));
          if (matcher2.test(result)) {
            result = result.replace(matcher2, "/[..." + key2 + "]");
          }
        }
      }
      return result;
    } catch (e) {
      return pathname;
    }
  }

  function turnValueToRegExp(value) {
    return new RegExp("/" + escapeRegExp(value) + "(?=[/?#]|$)");
  }

  function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function getScriptSrc(props) {
    if (props.scriptSrc) {
      return props.scriptSrc;
    }
    if (isDevelopment()) {
      return "https://va.vercel-scripts.com/v1/speed-insights/script.debug.js";
    }
    if (props.dsn) {
      return "https://va.vercel-scripts.com/v1/speed-insights/script.js";
    }
    if (props.basePath) {
      return props.basePath + "/speed-insights/script.js";
    }
    return "/_vercel/speed-insights/script.js";
  }

  // src/generic.ts
  function injectSpeedInsights(props) {
    props = props || {};
    if (!isBrowser() || props.route === null) return null;
    initQueue();
    var src = getScriptSrc(props);
    if (document.head.querySelector('script[src*="' + src + '"]')) return null;
    if (props.beforeSend) {
      window.si && window.si("beforeSend", props.beforeSend);
    }
    var script = document.createElement("script");
    script.src = src;
    script.defer = true;
    script.dataset.sdkn = name + (props.framework ? "/" + props.framework : "");
    script.dataset.sdkv = version;
    if (props.sampleRate) {
      script.dataset.sampleRate = props.sampleRate.toString();
    }
    if (props.route) {
      script.dataset.route = props.route;
    }
    if (props.endpoint) {
      script.dataset.endpoint = props.endpoint;
    } else if (props.basePath) {
      script.dataset.endpoint = props.basePath + "/speed-insights/vitals";
    }
    if (props.dsn) {
      script.dataset.dsn = props.dsn;
    }
    if (isDevelopment() && props.debug === false) {
      script.dataset.debug = "false";
    }
    script.onerror = function() {
      console.log(
        "[Vercel Speed Insights] Failed to load script from " + src + ". Please check if any content blockers are enabled and try again."
      );
    };
    document.head.appendChild(script);
    return {
      setRoute: function(route) {
        script.dataset.route = route || undefined;
      }
    };
  }

  // Export to global scope for WordPress
  window.injectSpeedInsights = injectSpeedInsights;
  window.computeRoute = computeRoute;

})(window);
