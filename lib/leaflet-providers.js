L.TileLayer.Provider = L.TileLayer.extend({
  initialize: function(arg, options) {
    var providers = L.TileLayer.Provider.providers;

    var parts = arg.split('.');

    var providerName = parts[0];
    var variantName = parts[1];

    if (!providers[providerName]) {
      throw 'No such provider (' + providerName + ')';
    }

    var provider = {
      url: providers[providerName].url,
      options: providers[providerName].options
    };

    // overwrite values in provider from variant.
    if (variantName && 'variants' in providers[providerName]) {
      if (!(variantName in providers[providerName].variants)) {
        throw 'No such variant of ' + providerName + ' (' + variantName + ')';
      }
      var variant = providers[providerName].variants[variantName];
      var variantOptions;
      if (typeof variant === 'string') {
        variantOptions = {
          variant: variant
        };
      } else {
        variantOptions = variant.options;
      }
      provider = {
        url: variant.url || provider.url,
        options: L.Util.extend({}, provider.options, variantOptions)
      };
    }

    // replace attribution placeholders with their values from toplevel provider attribution,
    // recursively
    var attributionReplacer = function (attr) {
      if (attr.indexOf('{attribution.') === -1) {
        return attr;
      }
      return attr.replace(/\{attribution.([^}]*)\}/,
        function (match, attributionName) {
          return attributionReplacer(providers[attributionName].options.attribution);
        }
      );
    };
    provider.options.attribution = attributionReplacer(provider.options.attribution);

    // Compute final options combining provider options with any user overrides
    var layerOpts = L.Util.extend({}, provider.options, options);
    L.TileLayer.prototype.initialize.call(this, provider.url, layerOpts);
  }
});

// 添加工厂方法
L.tileLayer.provider = function (provider, options) {
  return new L.TileLayer.Provider(provider, options);
};

// 定义可用的地图服务提供商
L.TileLayer.Provider.providers = {
  OpenStreetMap: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    options: {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    },
    variants: {
      Mapnik: {},
      HOT: {
        url: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
        options: {
          attribution: '{attribution.OpenStreetMap}, Tiles style by <a href="https://www.hotosm.org/" target="_blank">HOT</a>'
        }
      }
    }
  },
  Esri: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/{variant}/MapServer/tile/{z}/{y}/{x}',
    options: {
      variant: 'World_Street_Map',
      attribution: 'Tiles &copy; Esri'
    },
    variants: {
      WorldStreetMap: {
        options: {
          attribution: '{attribution.Esri} &mdash; Source: Esri, DeLorme, NAVTEQ, USGS, Intermap, iPC, NRCAN, Esri Japan, METI, Esri China (Hong Kong), Esri (Thailand), TomTom, 2012'
        }
      },
      WorldImagery: {
        options: {
          variant: 'World_Imagery',
          attribution: '{attribution.Esri} &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
        }
      }
    }
  }
};