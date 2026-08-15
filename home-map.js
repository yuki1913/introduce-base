/* ホーム専用の軽量地図。geo.js は地図が近づいた時だけ読み込む。 */
(function(){
  var mount=document.getElementById("homeMap");
  if(!mount) return;
  var NS="http://www.w3.org/2000/svg";
  var ORDER=["北海道","東北","関東","中部","近畿","中国","四国","九州","沖縄"];
  var LABELS={
    "北海道":[142.4,43.2],"東北":[140.6,39.0],"関東":[139.7,36.0],
    "中部":[137.2,36.2],"近畿":[135.4,34.8],"中国":[132.6,34.8],
    "四国":[133.6,33.6],"九州":[130.5,32.4],"沖縄":[127.8,26.3]
  };
  var counts=window.YSHOME_COUNTS||{};
  var started=false;

  function project(point){
    return [20+(point[0]-122)*23.75,20+(46-point[1])*16.5];
  }
  function ringPath(ring){
    return ring.map(function(point,i){var p=project(point);return (i?"L":"M")+p[0].toFixed(1)+" "+p[1].toFixed(1);}).join(" ")+" Z";
  }
  function geometryPath(geometry){
    var polys=geometry.type==="Polygon"?[geometry.coordinates]:geometry.coordinates;
    return polys.map(function(poly){return poly.map(ringPath).join(" ");}).join(" ");
  }
  function svgEl(name,attrs){
    var node=document.createElementNS(NS,name);
    Object.keys(attrs||{}).forEach(function(key){node.setAttribute(key,attrs[key]);});
    return node;
  }
  function render(){
    var geo=window.JAPANGEO;
    if(!geo||!geo.features){mount.textContent="地図を読み込めませんでした。地方一覧からお選びください。";return;}
    mount.textContent="";
    var svg=svgEl("svg",{viewBox:"100 0 560 390",role:"img","aria-labelledby":"homeMapTitle homeMapDesc"});
    var title=svgEl("title",{id:"homeMapTitle"});title.textContent="地方別の掲載件数";svg.appendChild(title);
    var desc=svgEl("desc",{id:"homeMapDesc"});desc.textContent="地方を選ぶと、その地方の拠点一覧へ移動します。";svg.appendChild(desc);
    ORDER.forEach(function(region,index){
      var link=svgEl("a",{href:"search.html?region="+encodeURIComponent(region),"aria-label":region+"、"+(counts[region]||0)+"件"});
      link.classList.add("home-map-region","region-tone-"+(index%5));
      geo.features.filter(function(feature){return feature.properties.region===region;}).forEach(function(feature){
        link.appendChild(svgEl("path",{d:geometryPath(feature.geometry),"fill-rule":"evenodd"}));
      });
      var loc=LABELS[region];
      if(loc){
        var p=project(loc), label=svgEl("g",{class:"home-map-label",transform:"translate("+p[0].toFixed(1)+" "+p[1].toFixed(1)+")"});
        var text=svgEl("text",{"text-anchor":"middle",y:"-3"});text.textContent=region;label.appendChild(text);
        var count=svgEl("text",{"text-anchor":"middle",y:"14",class:"home-map-count"});count.textContent=(counts[region]||0)+"件";label.appendChild(count);
        link.appendChild(label);
      }
      svg.appendChild(link);
    });
    mount.appendChild(svg);
  }
  function load(){
    if(started) return; started=true;
    if(window.JAPANGEO){render();return;}
    var script=document.createElement("script");script.src="geo.js";script.onload=render;
    script.onerror=function(){mount.textContent="地図を読み込めませんでした。地方一覧からお選びください。";};
    document.head.appendChild(script);
  }
  if("IntersectionObserver" in window){
    var observer=new IntersectionObserver(function(entries){if(entries.some(function(entry){return entry.isIntersecting;})){observer.disconnect();load();}},{rootMargin:"500px"});
    observer.observe(mount);
  }else load();
})();
