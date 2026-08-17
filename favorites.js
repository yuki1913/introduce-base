/* favorites.js — ログインなしの「気になるリスト」 */
(function(){
  "use strict";

  var STORAGE_KEY="ysmap-favorites-v1";
  var SVG_HEART='<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z"/></svg>';

  function ids(){
    try{
      var parsed=JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]");
      return Array.isArray(parsed)?parsed.filter(function(id){return typeof id==="string"&&id;}):[];
    }catch(e){return [];}
  }
  function write(next){
    var unique=next.filter(function(id,index,list){return id&&list.indexOf(id)===index;});
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify(unique));}catch(e){}
    return unique;
  }
  function has(id){return ids().indexOf(id)>=0;}
  function count(){return ids().length;}
  function toggle(id){
    var next=ids(), index=next.indexOf(id), saved;
    if(index>=0){next.splice(index,1);saved=false;}else{next.push(id);saved=true;}
    write(next);
    window.dispatchEvent(new CustomEvent("ysfavoriteschange",{detail:{id:id,saved:saved,count:next.length}}));
    return saved;
  }
  function syncButton(button){
    var id=button&&button.dataset.favoriteId;
    if(!id)return;
    var saved=has(id);
    button.setAttribute("aria-pressed",String(saved));
    button.setAttribute("aria-label",saved?"気になるリストから外す":"気になるリストに追加");
    button.title=saved?"気になるリストから外す":"気になるリストに追加";
    var label=button.querySelector("[data-favorite-label]");
    if(label)label.textContent=saved?"保存済み":"気になる";
  }
  function syncAll(root){
    (root||document).querySelectorAll("[data-favorite-id]").forEach(syncButton);
    document.querySelectorAll("[data-favorite-count]").forEach(function(node){node.textContent=count();});
  }

  document.addEventListener("click",function(event){
    var button=event.target.closest("[data-favorite-id]");
    if(!button)return;
    event.preventDefault();
    event.stopPropagation();
    toggle(button.dataset.favoriteId);
  },true);
  window.addEventListener("ysfavoriteschange",function(){syncAll(document);});
  window.addEventListener("storage",function(event){if(event.key===STORAGE_KEY)syncAll(document);});
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",function(){syncAll(document);});
  else syncAll(document);

  window.YSFavorites={STORAGE_KEY:STORAGE_KEY,SVG_HEART:SVG_HEART,ids:ids,has:has,count:count,toggle:toggle,syncButton:syncButton,syncAll:syncAll};
})();
