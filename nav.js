/* nav.js — スマホのヘッダーメニュー
 *
 * スマホではナビが横スクロールになっていて、「はじめての方」「お問い合わせ」
 * 「診断する」が画面の外に出たまま気づけなかった。開閉できるメニューにする。
 *
 * マークアップはページ側に足さず、ここで組み立てる（全ページ＋生成した拠点ページ
 * すべてに同じ <nav> があるため）。JSが動かない環境では has-nav-toggle が
 * 付かないので、従来どおり横スクロールのナビのまま使える。
 */
(function(){
  "use strict";
  var header=document.querySelector(".site-header");
  if(!header) return;
  var inner=header.querySelector(".site-header-inner");
  var nav=header.querySelector(".site-nav");
  if(!inner||!nav) return;

  if(!nav.id) nav.id="siteNavPanel";

  var toggle=document.createElement("button");
  toggle.type="button";
  toggle.className="nav-toggle";
  toggle.setAttribute("aria-controls",nav.id);
  toggle.setAttribute("aria-expanded","false");
  toggle.innerHTML=
    '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">'+
    '<path d="M4 7h16M4 12h16M4 17h16"/></svg>'+
    '<span class="nav-toggle-label">メニュー</span>';
  inner.insertBefore(toggle,nav);
  header.classList.add("has-nav-toggle");

  function isOpen(){ return header.classList.contains("nav-open"); }
  function setOpen(open){
    header.classList.toggle("nav-open",open);
    toggle.setAttribute("aria-expanded",String(open));
  }

  toggle.addEventListener("click",function(){ setOpen(!isOpen()); });

  document.addEventListener("keydown",function(event){
    if(event.key==="Escape"&&isOpen()){ setOpen(false); toggle.focus(); }
  });
  document.addEventListener("click",function(event){
    if(isOpen()&&!header.contains(event.target)) setOpen(false);
  });
  // リンクを押したら閉じる。同じページ内に飛ぶ場合でも開いたままにならない。
  nav.addEventListener("click",function(event){ if(event.target.closest("a")) setOpen(false); });
  // 横向きにするなどで広い幅になったら、開いた状態を持ち越さない。
  window.addEventListener("resize",function(){ if(isOpen()&&window.innerWidth>=640) setOpen(false); });
})();
