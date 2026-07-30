/* shared.js — 複数ページ共通の定数・ヘルパー・カード生成（window.YS） */
(function(){
  var DATA=(window.YSDATA||[]).map(function(r,i){r._i=i;return r;});
  var BYID={}; DATA.forEach(function(r){BYID[r.id]=r;});

  var REGION_ORDER=["北海道","東北","関東","中部","近畿","中国","四国","九州","沖縄","全国オンライン"];
  var CATS=["支援団体","プログラム","活動拠点","使用できる施設"];
  var STATUS_META={
    "掲載推奨":{cls:"s-rec",label:"掲載推奨"},"条件付き掲載":{cls:"s-cond",label:"条件つき"},
    "参考情報":{cls:"s-ref",label:"参考情報"},"掲載保留":{cls:"s-hold",label:"要確認"}
  };
  var DEFAULT_STATUS={"掲載推奨":1,"条件付き掲載":1};
  var FIELD_STYLE={
    "探究":["🔭","blue","science"],"科学・研究":["🧪","blue","science"],"天文":["🌌","blue","science"],"学校連携":["🏫","blue","science"],
    "大学連携":["🎓","blue","science"],"自習":["📖","blue","science"],"環境学習":["🌍","blue","science"],
    "交流":["🤝","pink","community"],"相談":["💬","pink","community"],"居場所":["🏡","pink","community"],"社会参画":["🗳️","pink","community"],
    "ボランティア":["🙌","pink","community"],"国際交流":["🌏","pink","community"],"チームビルディング":["🧩","pink","community"],"若者支援":["🌱","pink","community"],
    "自然体験":["🌲","green","nature"],"キャンプ":["⛺","green","nature"],"宿泊研修":["🏕️","green","nature"],"地域活動":["🏘️","green","nature"],"農業体験":["🌾","green","nature"],
    "文化・芸術":["🎨","orange","arts"],"音楽":["🎵","orange","arts"],"ものづくり":["🔨","orange","arts"],"発表":["🎤","orange","arts"],
    "イベント開催":["🎪","orange","arts"],"自主企画":["✨","orange","arts"],
    "起業":["🚀","purple","startup"],"ビジネス":["💼","purple","startup"],"企業連携":["🏢","purple","startup"],"キャリア教育":["🧭","purple","startup"],
    "メンタリング":["🧑‍🏫","purple","startup"],"オープンイノベーション":["💡","purple","startup"],"ピッチ・発表":["📣","purple","startup"],
    "スポーツ":["⚽","teal","sports"]
  };
  var CAT_FALLBACK={"支援団体":["🤝","pink","community"],"プログラム":["✨","orange","arts"],"活動拠点":["📍","green","nature"],"使用できる施設":["🏢","blue","science"]};
  var CAT_KEYS=["nature","science","community","arts","startup","sports"];
  var CAT_IMGS={nature:"img/cat-nature.png",science:"img/cat-science.png",community:"img/cat-community.png",arts:"img/cat-arts.png",startup:"img/cat-startup.png",sports:"img/cat-sports.png"};
  var CAT_LABELS={nature:"自然・体験",science:"探究・科学",community:"居場所・交流",arts:"文化・芸術",startup:"起業・キャリア",sports:"スポーツ"};
  var CAT_EMOJIS={nature:"🌲",science:"🔭",community:"🏡",arts:"🎨",startup:"🚀",sports:"⚽"};
  var CAT_FIELD_MAP={
    nature:["自然体験","キャンプ","宿泊研修","地域活動","農業体験","環境学習"],
    science:["探究","科学・研究","天文","自習","学校連携","大学連携"],
    community:["居場所","交流","相談","社会参画","ボランティア","国際交流","チームビルディング","若者支援"],
    arts:["文化・芸術","音楽","ものづくり","発表","イベント開催","自主企画"],
    startup:["起業","ビジネス","企業連携","キャリア教育","メンタリング","オープンイノベーション","ピッチ・発表"],
    sports:["スポーツ"]
  };
  var CAT_PHOTO=CAT_IMGS;
  var HUE_COLOR={green:"#1B9E6B",blue:"#2E6FD0",orange:"#F5811F",purple:"#6C4FD4",pink:"#F15C74",teal:"#0E9E93"};

  function esc(s){return (s||"").replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];});}
  function el(t,c,txt){var e=document.createElement(t);if(c)e.className=c;if(txt!=null)e.textContent=txt;return e;}
  function coverOf(r){
    var tags=r.fieldTags||[];
    for(var i=0;i<tags.length;i++){if(FIELD_STYLE[tags[i]])return {emoji:FIELD_STYLE[tags[i]][0],hue:FIELD_STYLE[tags[i]][1],catKey:FIELD_STYLE[tags[i]][2],label:tags[i]};}
    if(r.region==="全国オンライン")return {emoji:"💻",hue:"blue",catKey:"science",label:tags[0]||"オンライン"};
    var cats=r.cats||[];
    for(var j=0;j<cats.length;j++){if(CAT_FALLBACK[cats[j]])return {emoji:CAT_FALLBACK[cats[j]][0],hue:CAT_FALLBACK[cats[j]][1],catKey:CAT_FALLBACK[cats[j]][2],label:tags[0]||cats[j]};}
    return {emoji:"🌱",hue:"green",catKey:"nature",label:tags[0]||"活動"};
  }
  function getPhotoUrl(cv){return CAT_PHOTO[cv.catKey]||CAT_PHOTO.community;}
  function mapUrl(r){return "https://www.google.com/maps/search/?api=1&query="+encodeURIComponent((r.address||r.name)+" "+r.name);}
  function markerIcon(cv){
    var color=HUE_COLOR[cv.hue]||HUE_COLOR.green;
    return L.divIcon({html:'<div class="ys-pin" style="background:'+color+'">'+cv.emoji+'</div>',className:"",iconSize:[32,32],iconAnchor:[16,16],popupAnchor:[0,-16]});
  }
  var SVG_EXT='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>';
  var SVG_MAP='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-6-5.7-6-10a6 6 0 0 1 12 0c0 4.3-6 10-6 10Z"/><circle cx="12" cy="11" r="2"/></svg>';
  var SVG_PIN='<svg class="pin-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-6-5.7-6-10a6 6 0 0 1 12 0c0 4.3-6 10-6 10Z"/><circle cx="12" cy="11" r="2"/></svg>';

  function card(r){
    var c=el("div","card");
    var sm=STATUS_META[r.status]||{cls:"s-ref",label:r.status};
    var cv=coverOf(r);
    var photoWrap=el("div","card-photo");
    var pImg=document.createElement("img");
    pImg.src=r.image||getPhotoUrl(cv); pImg.alt=r.name+"の活動イメージ"; pImg.loading="lazy";
    pImg.onerror=function(){
      var fb=el("div","card-cover cv-"+cv.hue); fb.innerHTML='<span class="cover-emoji">'+cv.emoji+'</span>';
      var top=el("div","photo-pills");
      top.appendChild(el("span","pill rgn",r.region==="全国オンライン"?"オンライン":r.region));
      top.appendChild(el("span","pill st "+sm.cls,sm.label)); fb.appendChild(top);
      if(r.logo){var lg=document.createElement("img");lg.className="card-logo";lg.src=r.logo;lg.alt="";lg.onerror=function(){this.remove();};fb.appendChild(lg);}
      c.replaceChild(fb,photoWrap);
    };
    photoWrap.appendChild(pImg);
    photoWrap.appendChild(el("div","card-photo-overlay"));
    var pills=el("div","photo-pills");
    pills.appendChild(el("span","pill rgn",r.region==="全国オンライン"?"オンライン":r.region));
    pills.appendChild(el("span","pill st "+sm.cls,sm.label));
    photoWrap.appendChild(pills);
    if(r.logo){var lg=document.createElement("img");lg.className="card-logo";lg.src=r.logo;lg.alt=r.name+"のロゴ";lg.loading="lazy";lg.onerror=function(){this.remove();};photoWrap.appendChild(lg);}
    c.appendChild(photoWrap);
    var body=el("div","card-body");
    var place=el("div","place"); place.innerHTML=SVG_PIN;
    [r.pref,r.city].filter(function(x,i,a){return x&&a.indexOf(x)===i;}).forEach(function(p,i){if(i)place.appendChild(el("span","sep","·"));place.appendChild(el("span",null,p));});
    body.appendChild(place);
    body.appendChild(el("h3",null,r.name));
    body.appendChild(el("p","intro",r.intro));
    if(r.fieldTags&&r.fieldTags.length){var tl=el("div","tagline");r.fieldTags.slice(0,4).forEach(function(t){tl.appendChild(el("span","tag",(FIELD_STYLE[t]?FIELD_STYLE[t][0]+" ":"")+t));});body.appendChild(tl);}
    var meta=el("div","meta");
    if(r.targets&&r.targets.length){var m=el("div","mrow");m.appendChild(el("span","mk","対象"));m.appendChild(el("span",null,r.targets.slice(0,3).join("・")));meta.appendChild(m);}
    if(r.station){var m2=el("div","mrow");m2.appendChild(el("span","mk","アクセス"));m2.appendChild(el("span",null,r.station));meta.appendChild(m2);}
    if(meta.children.length)body.appendChild(meta);
    if(r.status==="条件付き掲載")body.appendChild(el("div","note","利用に条件がある場合があります。参加前に公式サイトでご確認ください。"));
    else if(r.status==="掲載保留"||r.status==="参考情報")body.appendChild(el("div","note","情報が変わっている可能性があります。最新の内容は公式サイトでご確認ください。"));
    var act=el("div","actions");
    if(r.url){var a=el("a","btn btn-primary");a.href=r.url;a.target="_blank";a.rel="noopener";a.innerHTML=SVG_EXT+"公式サイト";act.appendChild(a);}
    if(r.address){var mb=el("a","btn btn-ghost");mb.href=mapUrl(r);mb.target="_blank";mb.rel="noopener";mb.innerHTML=SVG_MAP+"地図";act.appendChild(mb);}
    if(act.children.length)body.appendChild(act);
    c.appendChild(body);
    c.onclick=function(e){ if(e.target.closest("a")) return; location.href="spot.html?id="+encodeURIComponent(r.id); };
    return c;
  }

  window.YS={
    DATA:DATA, BYID:BYID, REGION_ORDER:REGION_ORDER, CATS:CATS, STATUS_META:STATUS_META, DEFAULT_STATUS:DEFAULT_STATUS,
    FIELD_STYLE:FIELD_STYLE, CAT_KEYS:CAT_KEYS, CAT_IMGS:CAT_IMGS, CAT_LABELS:CAT_LABELS, CAT_EMOJIS:CAT_EMOJIS, CAT_FIELD_MAP:CAT_FIELD_MAP,
    esc:esc, el:el, coverOf:coverOf, getPhotoUrl:getPhotoUrl, mapUrl:mapUrl, markerIcon:markerIcon, card:card,
    SVG_EXT:SVG_EXT, SVG_MAP:SVG_MAP, SVG_PIN:SVG_PIN
  };
})();
