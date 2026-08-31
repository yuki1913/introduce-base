/* ホーム専用の軽量地図。geo.js は地図が近づいた時だけ読み込む。 */
(function(){
  var mount=document.getElementById("homeMap");
  if(!mount) return;
  var NS="http://www.w3.org/2000/svg";
  var ORDER=["北海道","東北","関東","中部","近畿","中国","四国","九州","沖縄"];
  var REGION_KEYS={"北海道":"hokkaido","東北":"tohoku","関東":"kanto","中部":"chubu","近畿":"kinki","中国":"chugoku","四国":"shikoku","九州":"kyushu","沖縄":"okinawa"};
  var LABELS={
    "北海道":[142.4,43.2],"東北":[140.6,39.0],"関東":[139.7,36.0],
    "中部":[137.2,36.2],"近畿":[135.4,34.8],"中国":[132.6,34.8],
    "四国":[133.6,33.6],"九州":[130.5,32.4],"沖縄":[127.8,26.3]
  };
  var counts=window.YSHOME_COUNTS||{};
  var shell=document.getElementById("homeMapShell");
  var popover=document.getElementById("mapPickDialog");
  var popoverTitle=document.getElementById("mapPickTitle");
  var popoverCount=document.getElementById("mapPickCount");
  var popoverList=document.getElementById("mapPickCards");
  var popoverClose=document.getElementById("mapPickClose");
  var activeLink=null;
  var started=false;

  function closePopover(restoreFocus){
    if(!popover||popover.hidden) return;
    popover.hidden=true;
    if(activeLink){
      activeLink.classList.remove("is-selected");
      activeLink.setAttribute("aria-expanded","false");
      if(restoreFocus) activeLink.focus();
      activeLink=null;
    }
  }
  function compactRow(record){
    var Y=window.YS, cover=Y.coverOf(record), fallback=Y.getPhotoUrl(cover);
    var row=Y.el("a","map-pick-row");
    row.href="spot.html?id="+encodeURIComponent(record.id);
    row.dataset.cat=cover.catKey;
    var image=document.createElement("img");
    image.src=record.image||fallback; image.alt=Y.photoAlt(record,cover);
    image.loading="lazy"; image.decoding="async"; image.referrerPolicy="no-referrer";
    image.onerror=function(){
      if(!this.dataset.fallback&&this.src.indexOf(fallback)===-1){
        this.dataset.fallback="1";this.src=fallback;this.alt=Y.photoAlt({},cover);this.removeAttribute("referrerpolicy");
      }
    };
    row.appendChild(image);
    var body=Y.el("div","map-pick-row-body");
    body.appendChild(Y.el("h4",null,record.name));
    var place=[record.pref,record.city].filter(function(x,i,a){return x&&a.indexOf(x)===i;}).join("・")||record.region;
    var meta=Y.el("p","map-pick-row-meta");
    meta.appendChild(Y.el("span","map-pick-row-cat",Y.CAT_LABELS[cover.catKey]||"活動"));
    meta.appendChild(Y.el("span","map-pick-row-place",place));
    body.appendChild(meta); row.appendChild(body);
    row.setAttribute("aria-label",record.name+"、"+place+"、詳細を見る");
    return row;
  }
  function clamp(value,min,max){return Math.max(min,Math.min(value,Math.max(min,max)));}
  function positionPopover(trigger){
    if(!shell||!popover||popover.hidden||!trigger) return;
    var shellRect=shell.getBoundingClientRect(), triggerRect=trigger.getBoundingClientRect(), popRect=popover.getBoundingClientRect();
    var left=triggerRect.left-shellRect.left+(triggerRect.width-popRect.width)/2;
    var top=triggerRect.top-shellRect.top+(triggerRect.height-popRect.height)/2;
    popover.style.left=clamp(left,8,shellRect.width-popRect.width-8)+"px";
    popover.style.top=clamp(top,8,shellRect.height-popRect.height-8)+"px";
  }
  function openPicks(region,trigger){
    if(!popover||!popoverTitle||!popoverList||!window.YS) return;
    var picks=window.YS.regionPicks(region,3);
    popoverTitle.textContent=region;
    if(popoverCount) popoverCount.textContent=picks.length+"件";
    popoverList.textContent="";
    picks.forEach(function(record){popoverList.appendChild(compactRow(record));});
    if(activeLink){activeLink.classList.remove("is-selected");activeLink.setAttribute("aria-expanded","false");}
    activeLink=trigger; activeLink.classList.add("is-selected");activeLink.setAttribute("aria-expanded","true");
    popover.hidden=false;
    positionPopover(trigger);
    if(popoverClose) popoverClose.focus({preventScroll:true});
  }
  if(popover){
    if(popoverClose) popoverClose.addEventListener("click",function(){closePopover(true);});
    document.addEventListener("keydown",function(event){if(event.key==="Escape")closePopover(true);});
    document.addEventListener("click",function(event){
      if(popover.hidden||popover.contains(event.target)||event.target.closest(".home-map-region")) return;
      closePopover(false);
    });
    window.addEventListener("resize",function(){if(activeLink)positionPopover(activeLink);});
  }

  function project(point){
    /* 北を上にし、緯度36度付近の実距離比に近い縦横比で描く。 */
    return [20+(point[0]-122)*18,20+(46-point[1])*22];
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
    var svg=svgEl("svg",{viewBox:"50 20 500 420",role:"img","aria-labelledby":"homeMapTitle homeMapDesc"});
    var title=svgEl("title",{id:"homeMapTitle"});title.textContent="地方別の掲載件数";svg.appendChild(title);
    var desc=svgEl("desc",{id:"homeMapDesc"});desc.textContent="地方ごとに色分けした日本地図です。沖縄は右下の挿入図に表示しています。地方を選ぶと、その地方からおすすめの場所を3件表示します。";svg.appendChild(desc);
    svg.appendChild(svgEl("rect",{class:"home-map-inset",x:"295",y:"328",width:"230",height:"108",rx:"18","aria-hidden":"true"}));
    // 地方の形はあとから描いたものが上に重なるので、ラベルを地方の中に置くと
    // 隣の地方の塗りに件数が隠れてしまう。ラベルはまとめて最前面の層に描く。
    // （.home-map-label は pointer-events:none なので、クリックは下の地方に通る）
    var labelLayer=svgEl("g",{class:"home-map-labels","aria-hidden":"true"});
    ORDER.forEach(function(region){
      var attrs={href:"search.html?region="+encodeURIComponent(region),"aria-label":region+"、おすすめを3件表示","aria-haspopup":"dialog","aria-controls":"mapPickDialog","aria-expanded":"false","data-region":REGION_KEYS[region]};
      var link=svgEl("a",attrs);
      link.classList.add("home-map-region");
      link.addEventListener("click",function(event){event.preventDefault();openPicks(region,link);});
      var shape=svgEl("g",region==="沖縄"?{transform:"matrix(1.35 0 0 1.35 263 -245)"}:{});
      geo.features.filter(function(feature){return feature.properties.region===region;}).forEach(function(feature){
        shape.appendChild(svgEl("path",{d:geometryPath(feature.geometry),"fill-rule":"evenodd"}));
      });
      link.appendChild(shape);
      var loc=LABELS[region];
      if(loc){
        var p=region==="沖縄"?[325,350]:project(loc), label=svgEl("g",{class:"home-map-label",transform:"translate("+p[0].toFixed(1)+" "+p[1].toFixed(1)+")"});
        var text=svgEl("text",{"text-anchor":"middle",y:"-3"});text.textContent=region;label.appendChild(text);
        var count=svgEl("text",{"text-anchor":"middle",y:"14",class:"home-map-count"});count.textContent=(counts[region]||0)+"件";label.appendChild(count);
        labelLayer.appendChild(label);
      }
      svg.appendChild(link);
    });
    svg.appendChild(labelLayer);
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
