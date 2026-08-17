/* calendar.js — 拠点の予定を標準カレンダー形式（.ics）で保存する */
(function(){
  "use strict";

  var records={};
  var SVG_CALENDAR='<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/><path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/></svg>';
  var dialog=null,form=null,current=null;

  function register(input){
    if(Array.isArray(input))input.forEach(function(record){if(record&&record.id)records[record.id]=record;});
    else Object.keys(input||{}).forEach(function(id){records[id]=input[id];});
  }
  function pad(number){return String(number).padStart(2,"0");}
  function compactDate(date){return date.getFullYear()+pad(date.getMonth()+1)+pad(date.getDate());}
  function localDateTime(date){return compactDate(date)+"T"+pad(date.getHours())+pad(date.getMinutes())+"00";}
  function utcStamp(date){return date.getUTCFullYear()+pad(date.getUTCMonth()+1)+pad(date.getUTCDate())+"T"+pad(date.getUTCHours())+pad(date.getUTCMinutes())+pad(date.getUTCSeconds())+"Z";}
  function escapeIcs(value){return String(value||"").replace(/\\/g,"\\\\").replace(/\n/g,"\\n").replace(/,/g,"\\,").replace(/;/g,"\\;");}
  function eventUrl(record){
    if(location.protocol==="http:"||location.protocol==="https:")return location.origin+location.pathname.replace(/[^/]*$/,"")+"spot.html?id="+encodeURIComponent(record.id);
    return "spot.html?id="+encodeURIComponent(record.id);
  }
  function buildIcs(record,values){
    var dateParts=values.date.split("-").map(Number),allDay=!values.time;
    var start=new Date(dateParts[0],dateParts[1]-1,dateParts[2],allDay?0:Number(values.time.split(":")[0]),allDay?0:Number(values.time.split(":")[1]),0);
    var end=new Date(start.getTime()+(allDay?86400000:3600000));
    var kindLabels={visit:"行ってみる予定",deadline:"申し込み締切",consult:"見学・相談の予定"};
    var summary=record.name+"｜"+(kindLabels[values.kind]||kindLabels.visit);
    var description="参加前に必ず公式サイトで日時と利用条件を確認してください。\n"+eventUrl(record);
    var lines=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Ibasho Kikkake MAP//JP","CALSCALE:GREGORIAN","METHOD:PUBLISH","BEGIN:VEVENT","UID:"+record.id+"-"+Date.now()+"@ibasho-map","DTSTAMP:"+utcStamp(new Date())];
    if(allDay){lines.push("DTSTART;VALUE=DATE:"+compactDate(start));lines.push("DTEND;VALUE=DATE:"+compactDate(end));}
    else{lines.push("DTSTART:"+localDateTime(start));lines.push("DTEND:"+localDateTime(end));}
    lines.push("SUMMARY:"+escapeIcs(summary));
    if(record.address)lines.push("LOCATION:"+escapeIcs(record.address));
    lines.push("DESCRIPTION:"+escapeIcs(description));
    lines.push("URL:"+eventUrl(record));
    if(values.reminder&&values.reminder!=="none")lines.push("BEGIN:VALARM","TRIGGER:-"+values.reminder,"ACTION:DISPLAY","DESCRIPTION:"+escapeIcs(summary),"END:VALARM");
    lines.push("END:VEVENT","END:VCALENDAR","");
    return lines.join("\r\n");
  }
  function ensureDialog(){
    if(dialog)return;
    dialog=document.createElement("dialog");dialog.className="calendar-dialog";dialog.setAttribute("aria-labelledby","calendarDialogTitle");
    dialog.innerHTML='<form class="calendar-form" id="calendarForm">'
      +'<div class="calendar-dialog-head"><div><p>予定を入れる</p><h2 id="calendarDialogTitle">カレンダーに追加</h2></div><button type="button" class="calendar-close" aria-label="閉じる">×</button></div>'
      +'<p class="calendar-place" id="calendarPlace"></p>'
      +'<p class="calendar-help">開催日や申込締切は公式サイトで確認し、その日付を入力してください。</p>'
      +'<div class="calendar-fields"><label><span>予定の種類</span><select name="kind"><option value="visit">行ってみる予定</option><option value="deadline">申し込み締切</option><option value="consult">見学・相談の予定</option></select></label>'
      +'<label><span>日付 <b>必須</b></span><input name="date" type="date" required></label>'
      +'<label><span>開始時刻 <small>任意</small></span><input name="time" type="time"><small>未入力なら終日予定になります</small></label>'
      +'<label><span>通知</span><select name="reminder"><option value="P1D">1日前</option><option value="P3D">3日前</option><option value="PT2H">2時間前</option><option value="none">通知なし</option></select></label></div>'
      +'<p class="calendar-status" role="status" aria-live="polite"></p>'
      +'<div class="calendar-actions"><button type="button" class="calendar-cancel">キャンセル</button><button type="submit" class="calendar-save">'+SVG_CALENDAR+'カレンダー用ファイルを保存</button></div>'
      +'<p class="calendar-note">保存した .ics ファイルを開くと、Apple・Google・Outlookなどのカレンダーに追加できます。</p></form>';
    document.body.appendChild(dialog);form=dialog.querySelector("form");
    var close=function(){if(dialog.open)dialog.close();};
    dialog.querySelector(".calendar-close").onclick=close;dialog.querySelector(".calendar-cancel").onclick=close;
    dialog.addEventListener("click",function(event){if(event.target===dialog)close();});
    form.addEventListener("submit",function(event){
      event.preventDefault();if(!current||!form.reportValidity())return;
      var data=new FormData(form),values={kind:data.get("kind"),date:data.get("date"),time:data.get("time"),reminder:data.get("reminder")};
      var blob=new Blob([buildIcs(current,values)],{type:"text/calendar;charset=utf-8"}),url=URL.createObjectURL(blob),link=document.createElement("a");
      link.href=url;link.download=(current.name||"予定").replace(/[\\/:*?"<>|]/g,"-")+".ics";document.body.appendChild(link);link.click();link.remove();setTimeout(function(){URL.revokeObjectURL(url);},1000);
      dialog.querySelector(".calendar-status").textContent="ファイルを保存しました。開いてカレンダーに追加してください。";
    });
  }
  function open(record){
    ensureDialog();current=record;form.reset();dialog.querySelector("#calendarPlace").textContent=record.name;
    var dateInput=form.elements.date,dateHint=record.eventDate||record.deadline||"",today=new Date();
    dateInput.min=today.getFullYear()+"-"+pad(today.getMonth()+1)+"-"+pad(today.getDate());if(/^\d{4}-\d{2}-\d{2}$/.test(dateHint))dateInput.value=dateHint;
    dialog.querySelector(".calendar-status").textContent="";
    if(typeof dialog.showModal==="function")dialog.showModal();else dialog.setAttribute("open","");
    dateInput.focus();
  }
  document.addEventListener("click",function(event){
    var button=event.target.closest("[data-calendar-id]");if(!button)return;
    var record=records[button.dataset.calendarId];if(!record)return;
    event.preventDefault();event.stopPropagation();open(record);
  },true);

  window.YSCalendar={SVG_CALENDAR:SVG_CALENDAR,register:register,open:open,buildIcs:buildIcs};
})();
