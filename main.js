import './style.css';
import {Map, View} from 'ol';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import {OSM, TileWMS, Vector as VectorSource} from 'ol/source';
import GeoJSON from 'ol/format/GeoJSON';
import {fromLonLat} from 'ol/proj';
import {isEmpty} from 'ol/extent';
import {defaults,
  OverviewMap,
  ZoomToExtent,
  ScaleLine,
} from 'ol/control';
import 'ol-layerswitcher/dist/ol-layerswitcher.css';
import LayerSwitcher from 'ol-layerswitcher';
import { Stroke, Style } from "ol/style";
import LayerGroup from 'ol/layer/Group';

// coords madrid
const centro = fromLonLat([-3.74922, 40.463667]);
// extent peninsula ibérica 
const xyIbMin = fromLonLat([-11, 33]);
const xyIbMax = fromLonLat([5, 45]);
const extIb = [...xyIbMin, ...xyIbMax];
// extent peninsula ibérica 
const xyACMin = fromLonLat([-9.4, 42.5]);
const xyACMax = fromLonLat([-7.8, 43.8]);
const extAC = [...xyACMin, ...xyACMax];

// --------------------------------------------- Capas
// capas base 
const oSM = new TileLayer({
  title: 'OSM',
  visible: true,
  source: new OSM(),
  type: "base",
});

const pNOA = new TileLayer({
  title: "PNOA",
  visible: false,
  source: new TileWMS({
    url: "https://www.ign.es/wms-inspire/pnoa-ma?",
    params: { LAYERS: "OI.OrthoimageCoverage", TILED: true },
    attributions:
      '© <a href="https://www.ign.es/web/ign/portal">Instituto Geográfico Nacional</a>',
  }),
  type: "base",
});

const mTN50 = new TileLayer({
  title: "Primera edición MTN50",
  visible: false,
  source: new TileWMS({
    url: "https://www.ign.es/wms/primera-edicion-mtn",
    params: { LAYERS: "MTN50", TILED: true },
    attributions:
      '© <a href="https://www.ign.es/web/ign/portal">Instituto Geográfico Nacional</a>',
  }),
  type: "base",
});

// capa con caminos
const estiloCamino = function(feature, resolution) {
  let agrupacion = feature.get("agrupacion");
  let clr;
  switch(agrupacion){
    case 'Camino Francés': clr = '#FF0000'; break;
    case 'Caminos Andaluces': clr = '#00FF00'; break;
    case 'Caminos Catalanes': clr = '#0000FF'; break;
    case 'Caminos de Galicia': clr = '#FFFF00'; break;
    case 'Caminos del Centro': clr = '#00FFFF'; break;
    case 'Caminos del Este': clr = '#FF00FF'; break;
    case 'Caminos del Norte': clr = '#78D776'; break;
    case 'Caminos del Sureste': clr = '#808080'; break;
    case 'Caminos Insulares': clr = '#800000'; break;
    case 'Caminos Portugueses': clr = '#808000'; break;
    case 'Chemins vers Via des Piemonts': clr = '#008000'; break;
    case 'Chemins vers Via Turonensis': clr = '#800080'; break;
    case 'Via Tolosana Arles': clr = '#008080'; break;
    case 'Voie des Piemonts': clr = '#000080'; break;
    case 'Voie Turonensis - Paris': clr = '#000000'; break;       
    default: clr = '#FFFFFF'; 
    };
  return new Style({
    stroke: new Stroke({color: clr, width: 2})
  });
};

const caminos = new VectorLayer({
  title: 'Caminos de Santiago',
  source: new VectorSource({
    format: new GeoJSON(),
    url: './data/caminos_santiago.geojson',
  }),
  style: function (feature) {
    return estiloCamino(feature);
  }
});

const mapasBase = new LayerGroup({
  title: 'Capas base',
  layers: [oSM, pNOA, mTN50],
});

// ---------------------------------------------Controles extra
// zoom a A Coruña
const zoomToACoruña = new ZoomToExtent({
  extent: extAC,
  label: '',
  tipLabel: 'Zoom a A Coruña',
});

// escala
const escala = new ScaleLine({  
})

// mapa guia con OSM
const mapaGuia = new OverviewMap({
  layers: [
    new TileLayer({
      source: new OSM(),
    }),
  ],
  collapsed: false,
});

// control de capas
const controlcapas = new LayerSwitcher({
  startActive: true,
  activationMode: 'click',
});

const controlesExtra = [
  mapaGuia,
  zoomToACoruña,
  escala,
  controlcapas,
];

// -------------------------------------------------------- Mapa
// objeto mapa
const map = new Map({
  target: 'map',
  controls: defaults({
      zoom: true,
      rotate: false,
      attribution: true,
    }).extend(controlesExtra),
  layers: [
    mapasBase,
    caminos,
  ],
  view: new View({
    center: centro,
    zoom: 6,
    extent: extIb,
  })
});


// ----------------------------------------------------  mostrar info
const featureOverlay = new VectorLayer({
  source: new VectorSource(),
  map: map,
  style: new Style({                    
    stroke : new Stroke({ 
        color: '#ff00003b',
        width: 10
    })
  })
});

let highlight;

const displayFeatureInfo = function (pixel) {
  const feature = map.forEachFeatureAtPixel(pixel, function (feature) {
    return feature;
  });

  const info = document.getElementById("info-layer");
  if (feature) {
    let nombre = feature.get("nombre");
    let agrupacion = feature.get("agrupacion");
    let longitud = feature.get("longitud");
    let url_info = feature.get("url_info");
    info.innerHTML = `
    <table class="default">
      <tr>
        <th>Nombre</th>
        <td><a href="${url_info}" target="_blank">${nombre}</a></th>
      </tr>  
      <tr>
        <th>Agrupación</th>
        <td>${agrupacion}</td>
      </tr>
      <tr>
        <th>Longitud</th>
        <td>${longitud} km</td>
      </tr>
    </table>`;
  } else {
    info.innerHTML =
      "<i>Haga click sobre un camino para consulta de información</i>";
  }

  if (feature !== highlight) {
    if (highlight) {
      featureOverlay.getSource().removeFeature(highlight);
    }
    if (feature) {
      featureOverlay.getSource().addFeature(feature);
    }
    highlight = feature;
  }
};

map.on("click", function (evt) {
  displayFeatureInfo(evt.pixel);
});