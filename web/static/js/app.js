/*! PodNest - Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com> | MIT License */

"use strict";(()=>{var m={async _req(t,e,s,a=6e4){let o=new AbortController,n=setTimeout(()=>o.abort(),a),r={method:t,headers:{"Content-Type":"application/json"},signal:o.signal};t!=="GET"&&t!=="HEAD"&&(r.headers["X-CSRF-Token"]=window.KP?.csrf??""),s!==void 0&&(r.body=JSON.stringify(s));try{let i=await fetch("/api"+e,r);clearTimeout(n);let l=i.status===204?null:await i.json().catch(()=>null);if(i.status===401)return window.location.href="/login?msg=Your+session+has+expired+%E2%80%94+please+log+in+again",null;if(!i.ok)throw new Error(l?.error||`HTTP ${i.status}`);return l}catch(i){throw clearTimeout(n),i}},get:t=>m._req("GET",t),post:(t,e,s)=>m._req("POST",t,e,s),put:(t,e,s)=>m._req("PUT",t,e,s),delete:t=>m._req("DELETE",t),patch:(t,e)=>m._req("PATCH",t,e)};var g=t=>String(t).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");function E(t){return t===0?"0 B":t<1024?`${t} B`:t<1048576?`${(t/1024).toFixed(1)} KB`:t<1073741824?`${(t/1048576).toFixed(1)} MB`:`${(t/1073741824).toFixed(2)} GB`}var tt=()=>'<div class="kp-spinner"><div uk-spinner="ratio: 1.25"></div></div>',P=t=>`<div class="kp-empty">
        <div class="kp-empty-icon" uk-icon="icon: warning; ratio: 2.5"></div>
        <div class="kp-empty-text">${t}</div>
    </div>`,et=(t,e)=>`<div class="kp-empty">
        <div class="kp-empty-icon" uk-icon="icon: ${t}; ratio: 2.5"></div>
        <div class="kp-empty-text">${e}</div>
    </div>`,H=t=>{let e={1:["running","Running"],2:["stopped","Stopped"],3:["restarting","Restarting"],4:["error","Error"]},[s,a]=e[t]||["stopped","Unknown"];return`<span class="kp-status kp-status-${s}">${a}</span>`},Se=t=>({3:"8.2",4:"8.3",5:"8.4",6:"8.5"})[t]||"?",V=t=>({1:"WordPress",2:"PHP",3:"Static",4:"Node.js",5:".NET",6:"Reverse Proxy",7:"Python"})[t]||"?",q=()=>window.KP.user.role===window.KP.roles.admin,R=t=>{switch(t.SiteType){case 1:case 2:return`PHP ${Se(t.PHPVersion)}`;case 4:return`Node ${{2:"22",4:"24",5:"25",6:"26"}[t.RuntimeVersion]||"?"}`;case 5:return`.NET ${{1:"8.0",2:"9.0",3:"10.0"}[t.RuntimeVersion]||"?"}`;case 7:return`Python ${{1:"3.11",2:"3.12",3:"3.13",4:"3.14"}[t.RuntimeVersion]||"?"}`;case 6:return"Reverse Proxy";default:return""}},F=t=>({id:t.id??t.ID,uname:t.uname??t.UName,uhash:t.uhash??t.UHash,fname:t.fname??t.FName,lname:t.lname??t.LName,email:t.email??t.Email,phone:t.phone??t.Phone,role:t.role??t.Role,totp_enabled:t.totp_enabled??!1,notify_email:t.notify_email??!1,notify_sms:t.notify_sms??!1,created:t.created??t.Created});function L(t,e){return new Promise(s=>{document.getElementById("kp-confirm-title").textContent=t,document.getElementById("kp-confirm-message").textContent=e;let a=UIkit.modal("#kp-confirm-modal");document.getElementById("kp-confirm-ok").addEventListener("click",()=>{a.hide(),s(!0)},{once:!0}),a.show(),document.getElementById("kp-confirm-modal").addEventListener("hidden",()=>s(!1),{once:!0})})}function $(t,e){let s=`
        <div id="kp-progress-modal" uk-modal="bg-close: false; esc-close: false; keyboard: false">
            <div class="uk-modal-dialog kp-modal uk-modal-body uk-text-center" style="max-width:420px">
                <div uk-spinner="ratio: 1.5" style="color:var(--kp-blue)"></div>
                <h3 class="uk-modal-title uk-margin-small-top" id="kp-progress-title">${t}</h3>
                <p class="kp-muted uk-text-small" id="kp-progress-message">${e}</p>
                <p class="kp-muted">
                    This may take several minutes while the task(s) complete, make sure to keep screen open until it has completed.
                </p>
            </div>
        </div>`;document.body.insertAdjacentHTML("beforeend",s),UIkit.modal("#kp-progress-modal").show()}function x(){let t=document.getElementById("kp-progress-modal");t&&(UIkit.modal(t).hide(),setTimeout(()=>t.remove(),300))}function Tt(t){return new Promise(e=>{let s="kp-clone-modal",a=`
            <div id="${s}" uk-modal>
                <div class="uk-modal-dialog kp-modal uk-modal-body" style="max-width:420px">
                    <h3 class="uk-modal-title">Clone Site</h3>
                    <p class="kp-muted uk-text-small uk-margin-small-bottom">
                        Enter a name for the clone of <strong>${t}</strong>.
                        Files, database, and configuration will be copied \u2014 domains will not.
                    </p>
                    <input id="kp-clone-name" class="uk-input kp-input" type="text"
                        placeholder="clone-name" autocomplete="off">
                    <div class="uk-flex uk-flex-right uk-margin-top" style="gap:8px">
                        <button class="uk-button kp-btn-ghost uk-modal-close" id="kp-clone-cancel">Cancel</button>
                        <button class="uk-button kp-btn-primary" id="kp-clone-ok">
                            <span uk-icon="move"></span> Clone
                        </button>
                    </div>
                </div>
            </div>`;document.body.insertAdjacentHTML("beforeend",a);let o=UIkit.modal(`#${s}`),n=document.getElementById("kp-clone-name"),r=document.getElementById("kp-clone-ok"),i=document.getElementById("kp-clone-cancel"),l=d=>{o.hide(),setTimeout(()=>document.getElementById(s)?.remove(),300),e(d)};r.addEventListener("click",()=>l(n.value.trim()||null),{once:!0}),i.addEventListener("click",()=>l(null),{once:!0}),document.getElementById(s).addEventListener("hidden",()=>l(null),{once:!0}),o.show(),setTimeout(()=>n.focus(),150),n.addEventListener("keydown",d=>{d.key==="Enter"&&r.click()})})}function _t(t){return new Promise(e=>{let s="kp-rename-modal",a=`
            <div id="${s}" uk-modal>
                <div class="uk-modal-dialog kp-modal uk-modal-body" style="max-width:420px">
                    <h3 class="uk-modal-title">Rename Site</h3>
                    <p class="kp-muted uk-text-small uk-margin-small-bottom">
                        Enter a new name for <strong>${t}</strong>.  Please have patience, this takes a few minutes.
                    </p>
                    <input id="kp-rename-name" class="uk-input kp-input" type="text"
                        value="${t}" autocomplete="off">
                    <div class="uk-flex uk-flex-right uk-margin-top" style="gap:8px">
                        <button class="uk-button kp-btn-ghost uk-modal-close" id="kp-rename-cancel">Cancel</button>
                        <button class="uk-button kp-btn-primary" id="kp-rename-ok">
                            <span uk-icon="pencil"></span> Rename
                        </button>
                    </div>
                </div>
            </div>`;document.body.insertAdjacentHTML("beforeend",a);let o=UIkit.modal(`#${s}`),n=document.getElementById("kp-rename-name"),r=document.getElementById("kp-rename-ok"),i=document.getElementById("kp-rename-cancel"),l=d=>{o.hide(),setTimeout(()=>document.getElementById(s)?.remove(),300),e(d)};r.addEventListener("click",()=>l(n.value.trim()||null),{once:!0}),i.addEventListener("click",()=>l(null),{once:!0}),document.getElementById(s).addEventListener("hidden",()=>l(null),{once:!0}),o.show(),setTimeout(()=>n.focus(),150),n.addEventListener("keydown",d=>{d.key==="Enter"&&r.click()})})}function mt(t,e,s){return new Promise(a=>{let o="kp-sync-modal",n=t==="pull",r=n?"Pull From Parent":"Push To Parent",i=n?"cloud-download":"cloud-upload",l=n?s:e,d=n?e:s,k=`
            <div id="${o}" uk-modal>
                <div class="uk-modal-dialog kp-modal uk-modal-body" style="max-width:460px">
                    <h3 class="uk-modal-title">${r}</h3>
                    <p class="kp-muted uk-text-small uk-margin-small-bottom">
                        This will overwrite all files and database content on
                        <strong>${d}</strong> with data from <strong>${l}</strong>.
                        This action cannot be undone.
                    </p>
                    <p class="kp-muted uk-text-small" style="color:var(--kp-red, #e05c5c)">
                        <span uk-icon="icon: warning; ratio: 0.85"></span>
                        <strong>${d}</strong> will be temporarily unavailable during the sync.
                    </p>
                    <div class="uk-flex uk-flex-right uk-margin-top" style="gap:8px">
                        <button class="uk-button kp-btn-ghost uk-modal-close" id="kp-sync-cancel">Cancel</button>
                        <button class="uk-button kp-btn-primary" id="kp-sync-ok">
                            <span uk-icon="${i}"></span> ${r}
                        </button>
                    </div>
                </div>
            </div>`;document.body.insertAdjacentHTML("beforeend",k);let b=UIkit.modal(`#${o}`),u=document.getElementById("kp-sync-ok"),p=document.getElementById("kp-sync-cancel"),v=h=>{b.hide(),setTimeout(()=>document.getElementById(o)?.remove(),300),a(h)};u.addEventListener("click",()=>v(!0),{once:!0}),p.addEventListener("click",()=>v(!1),{once:!0}),document.getElementById(o).addEventListener("hidden",()=>v(!1),{once:!0}),b.show()})}var y={routes:{},_ownHashChange:!1,register(t,e){this.routes[t]=e},async go(t,e={}){let s=Object.keys(e).length?t+"/"+Object.values(e).join("/"):t;this._ownHashChange=!0,window.location.hash=s,setTimeout(()=>{this._ownHashChange=!1},0),document.querySelectorAll(".kp-nav-link").forEach(n=>{n.classList.toggle("kp-active",n.dataset.view===t)}),document.querySelectorAll(".kp-bn-item[data-view]").forEach(n=>{n.classList.toggle("kp-active",n.dataset.view===t)});let a=this.routes[t];if(!a)return;let o=document.getElementById("kp-view");o.innerHTML=tt();try{await a(o,e)}catch(n){o.innerHTML=P(n.message)}}};function st(){let e=(window.location.hash.replace("#","")||"dashboard").split("/"),s=e[0],a={};return s==="site-detail"&&e[1]&&(a.id=e[1]),{view:s,params:a}}var c={show(t,e="info",s=7e3){let a={success:"check",error:"warning",info:"info"},o=document.createElement("div");o.className=`kp-toast kp-toast-${e}`,o.innerHTML=`<span uk-icon="${a[e]||"info"}"></span><span>${g(t)}</span>`,document.getElementById("kp-toasts").appendChild(o),UIkit.icon(o.querySelector("[uk-icon]")),setTimeout(()=>o.remove(),s)},success:t=>c.show(t,"success"),error:t=>c.show(t,"error"),info:t=>c.show(t,"info")};var $e=2e3;function Ee(){return`
        <div id="admin-logs-panel">
            <div class="kp-card uk-padding-small">
                <h3 class="kp-view-title uk-margin-small-bottom">Admin Logs</h3>

                <div class="kp-log-controls">
                    <select class="uk-select kp-select" id="admin-log-source" style="width:160px;height:38px">
                        <option value="proxy">Proxy Access Log</option>
                        <option value="waf">WAF Log</option>
                    </select>
                    <select class="uk-select kp-select" id="admin-log-tail" style="width:120px;height:38px">
                        <option value="100">100 lines</option>
                        <option value="250">250 lines</option>
                        <option value="500">500 lines</option>
                        <option value="1000">1000 lines</option>
                    </select>
                    <button class="uk-button kp-btn-secondary kp-btn-sm" id="admin-log-connect"
                        uk-tooltip="Start Tailing the Logs">
                        <span uk-icon="play"></span>
                    </button>
                    <button class="uk-button kp-btn-ghost kp-btn-sm" id="admin-log-disconnect" disabled
                        uk-tooltip="Stop Tailing the Logs">
                        <span uk-icon="ban"></span>
                    </button>
                    <button class="uk-button kp-btn-ghost kp-btn-sm" id="admin-log-clear"
                        uk-tooltip="Clear the Logs">
                        <span uk-icon="trash"></span>
                    </button>
                    <label style="font-size:0.82rem;color:var(--kp-text-dim);display:flex;align-items:center;gap:6px">
                        <input type="checkbox" class="uk-checkbox" id="admin-log-autoscroll" checked>
                        Auto-scroll
                    </label>
                </div>

                <div class="kp-log-header">
                    <div class="kp-log-dot kp-log-dot-red"></div>
                    <div class="kp-log-dot kp-log-dot-yellow"></div>
                    <div class="kp-log-dot kp-log-dot-green"></div>
                    <span style="font-size:0.72rem;color:var(--kp-text-dim);margin-left:8px"
                        id="admin-log-status">Disconnected</span>
                </div>
                <div class="kp-log-wrap" id="admin-log-output"></div>
            </div>
        </div>`}function Le(t){let e=null,s=!1,a=t.querySelector("#admin-log-output"),o=t.querySelector("#admin-log-connect"),n=t.querySelector("#admin-log-disconnect"),r=t.querySelector("#admin-log-clear"),i=t.querySelector("#admin-log-autoscroll"),l=t.querySelector("#admin-log-status");function d(u){for(u.split(`
`).forEach(p=>{if(!p)return;let v=document.createElement("div");v.className=p.match(/WAF BLOCK/i)?"kp-log-line-err":p.match(/WAF DETECT/i)?"kp-log-line-warn":p.match(/error|crit|emerg/i)?"kp-log-line-err":p.match(/warn/i)?"kp-log-line-warn":p.match(/info|notice/i)?"kp-log-line-info":"",v.textContent=p,a.appendChild(v)});a.childElementCount>$e;)a.removeChild(a.firstChild);i.checked&&(a.scrollTop=a.scrollHeight)}function k(){e&&(e.close(),e=null),s=!1,o.disabled=!1,n.disabled=!0,l&&(l.textContent="Disconnected")}o.addEventListener("click",()=>{k();let u=t.querySelector("#admin-log-source").value,p=t.querySelector("#admin-log-tail").value,v=location.protocol==="https:"?"wss":"ws",h=u==="waf"?`${v}://${location.host}/api/logs/waf?tail=${p}`:`${v}://${location.host}/api/logs/proxy?tail=${p}`;e=new WebSocket(h),e.onopen=()=>{s=!0,o.disabled=!0,n.disabled=!1,l&&(l.textContent=`Connected \u2014 ${u==="waf"?"WAF Log":"Proxy Access Log"}`)},e.onmessage=f=>d(f.data),e.onerror=()=>{},e.onclose=()=>{s=!1,o.disabled=!1,n.disabled=!0,l&&(l.textContent="Disconnected")}}),n.addEventListener("click",k),r.addEventListener("click",()=>{a.innerHTML=""}),t.querySelector("#admin-log-source").addEventListener("change",()=>{e&&e.readyState===WebSocket.OPEN&&(k(),o.click())});let b=y.go.bind(y);y.go=function(u,p={}){return e&&k(),b(u,p)}}function Pt(t){t.innerHTML=Ee(),Le(t)}var nt=50;function Te(t,e,s){let a=Math.max(1,Math.ceil(t.total/nt)),o=(t.entries??[]).map(Ct).join("")||'<tr><td colspan="8" class="uk-text-center" style="color:var(--kp-text-dim)">No records found</td></tr>';return`
        <div id="audit-log-panel">
            <div class="kp-view-header">
                <h1 class="kp-view-title" style="font-size:2rem;">Audit Log</h1>
            </div>

            <div class="kp-card uk-padding-small uk-margin-bottom">
                <div class="uk-flex uk-flex-middle uk-flex-wrap kp-filter-bar">
                    <input class="uk-input kp-input" id="al-filter-user" type="text"
                        placeholder="Username" value="${_(e.username)}">
                    <input class="uk-input kp-input" id="al-filter-action" type="text"
                        placeholder="Action" value="${_(e.action)}">
                    <input class="uk-input kp-input" id="al-filter-target" type="text"
                        placeholder="Target type" value="${_(e.target_type)}">
                    <input class="uk-input kp-input" id="al-filter-date-from" type="date"
                        value="${_(e.date_from)}">
                    <input class="uk-input kp-input" id="al-filter-date-to" type="date"
                        value="${_(e.date_to)}">
                    <select class="uk-select kp-select" id="al-filter-auth">
                        <option value=""  ${e.auth===""?"selected":""}>All requests</option>
                        <option value="1" ${e.auth==="1"?"selected":""}>Authenticated</option>
                        <option value="0" ${e.auth==="0"?"selected":""}>Unauthenticated</option>
                    </select>
                    <div class="uk-flex uk-flex-middle" style="gap:4px">
                        <button class="uk-button kp-btn-primary kp-btn-sm" id="al-filter-apply">
                            <span uk-icon="icon: search; ratio: 0.85"></span>
                        </button>
                        <button class="uk-button kp-btn-ghost kp-btn-sm" id="al-filter-clear">
                            <span uk-icon="icon: close; ratio: 0.85"></span>
                        </button>
                    </div>
                    <span id="al-record-count" class="uk-margin-auto-left kp-text-dim kp-text-sm">
                        ${t.total} record${t.total!==1?"s":""}
                    </span>
                </div>
            </div>

            <div class="kp-table-wrap">
                <div class="uk-overflow-auto">
                <table class="uk-table uk-table-divider uk-table-small uk-table-middle uk-margin-remove">
                    <thead>
                        <tr>
                            <th>Time</th>
                            <th>User</th>
                            <th>IP</th>
                            <th>Method</th>
                            <th>Action</th>
                            <th>Status</th>
                            <th>Details</th>
                            <th>State diff</th>
                        </tr>
                    </thead>
                    <tbody id="al-table-body">${o}</tbody>
                </table>
                </div>
            </div>

            ${a>1?`<div id="al-pager">${It(s,a)}</div>`:'<div id="al-pager"></div>'}
        </div>`}function Ct(t){let e=new Date(t.ts).toLocaleString(),s=t.username?`<span style="font-family:monospace">${_(t.username)}</span>`:'<span style="color:var(--kp-text-dim)">\u2014</span>',a=_e(t.status),n=t.prior_state||t.new_state?`<button class="uk-button kp-btn-ghost kp-btn-sm al-diff-btn"
                data-prior="${_(t.prior_state)}" data-new="${_(t.new_state)}">
               <span uk-icon="icon: git-fork; ratio: 0.85"></span>
           </button>`:"<span>\u2014</span>",r=t.details?`<button class="uk-button kp-btn-ghost kp-btn-sm al-diff-btn"
                data-prior="" data-new="${_(t.details)}">
               <span uk-icon="icon: info; ratio: 0.85"></span>
           </button>`:"<span>\u2014</span>";return`<tr>
        <td style="white-space:nowrap;font-size:0.82rem">${e}</td>
        <td>${s}</td>
        <td style="font-family:monospace;font-size:0.82rem">${_(t.ip)}</td>
        <td><span class="kp-badge">${_(t.method)}</span></td>
        <td style="font-family:monospace;font-size:0.82rem">${_(t.action)}</td>
        <td>${a}</td>
        <td>${r}</td>
        <td>${n}</td>
    </tr>`}function It(t,e){let s=t>1?'<button class="uk-button kp-btn-ghost kp-btn-sm" id="al-prev">\u2039 Prev</button>':"",a=t<e?'<button class="uk-button kp-btn-ghost kp-btn-sm" id="al-next">Next \u203A</button>':"";return`<div class="uk-flex uk-flex-middle uk-flex-center uk-margin-small-top" style="gap:12px">
        ${s}
        <span style="font-size:0.85rem;color:var(--kp-text-dim)">Page ${t} of ${e}</span>
        ${a}
    </div>`}function _e(t){return`<span class="kp-badge ${t>=500?"kp-badge-error":t>=400?"kp-badge-warn":t>=300?"kp-badge-info":"kp-badge-ok"}">${t}</span>`}var _=t=>g(t??"");async function Bt(t,e){let s=new URLSearchParams({page:e,page_size:nt});return t.username&&s.set("username",t.username),t.action&&s.set("action",t.action),t.target_type&&s.set("target_type",t.target_type),t.date_from&&s.set("date_from",t.date_from),t.date_to&&s.set("date_to",t.date_to),t.auth!==""&&s.set("auth",t.auth),m.get(`/audit?${s}`)}function Pe(t){return{username:t.querySelector("#al-filter-user").value.trim(),action:t.querySelector("#al-filter-action").value.trim(),target_type:t.querySelector("#al-filter-target").value.trim(),date_from:t.querySelector("#al-filter-date-from").value,date_to:t.querySelector("#al-filter-date-to").value,auth:t.querySelector("#al-filter-auth").value}}async function Ce(t,e,s){async function a(r,i){let l=await Bt(r,i);t.querySelector("#al-table-body").innerHTML=(l.entries??[]).map(Ct).join("")||'<tr><td colspan="8" class="uk-text-center kp-text-dim">No records found</td></tr>';let d=Math.max(1,Math.ceil(l.total/nt)),k=t.querySelector("#al-pager");k&&(k.innerHTML=d>1?It(i,d):""),t.querySelector("#al-record-count").textContent=`${l.total} record${l.total!==1?"s":""}`,o(t,r,i,d),e=r,s=i}function o(r,i,l,d){r.querySelector("#al-prev")?.addEventListener("click",()=>a(i,l-1)),r.querySelector("#al-next")?.addEventListener("click",()=>a(i,l+1))}t.querySelector("#al-filter-apply")?.addEventListener("click",()=>{a(Pe(t),1)}),t.querySelector("#al-filter-clear")?.addEventListener("click",()=>{["al-filter-user","al-filter-action","al-filter-target","al-filter-date-from","al-filter-date-to"].forEach(r=>{let i=t.querySelector(`#${r}`);i&&(i.value="")}),t.querySelector("#al-filter-auth").value="",a({username:"",action:"",target_type:"",date_from:"",date_to:"",auth:""},1)});let n=Math.max(1,Math.ceil(parseInt(t.querySelector("#al-record-count")?.textContent??"0")/nt));o(t,e,s,n),t.querySelector("#audit-log-panel")?.addEventListener("click",r=>{let i=r.target.closest(".al-diff-btn");if(!i)return;r.preventDefault(),r.stopPropagation();let l=i.dataset.prior??"",d=i.dataset.new??"",k="";l&&d?k=`=== BEFORE ===
`+at(l)+`

=== AFTER ===
`+at(d):d?k=at(d):k=at(l),document.body.insertAdjacentHTML("beforeend",`
            <div id="al-diff-modal-inst" uk-modal>
                <div class="uk-modal-dialog kp-modal uk-modal-body uk-width-large">
                    <button class="uk-modal-close-default" type="button" uk-close></button>
                    <h3 class="kp-view-title uk-margin-bottom">Request Detail</h3>
                    <pre class="kp-cron-output">${_(k)}</pre>
                </div>
            </div>`);let b=document.getElementById("al-diff-modal-inst");UIkit.modal(b).show(),b.addEventListener("hidden",()=>b.remove(),{once:!0})})}function at(t){try{return JSON.stringify(JSON.parse(t),null,2)}catch{return t}}async function qt(t){if(!q()){t.innerHTML=P("Access denied");return}let e={username:"",action:"",target_type:"",date_from:"",date_to:"",auth:""},s=await Bt(e,1);t.innerHTML=Te(s,e,1),Ce(t,e,1)}function ot(){document.body.insertAdjacentHTML("beforeend",`
        <div id="kp-create-site-modal" uk-modal>
            <div class="uk-modal-dialog kp-modal uk-modal-body uk-width-large">
                <button class="uk-modal-close-default" type="button" uk-close></button>
                <h3 class="kp-view-title">New Site</h3>
                <form id="create-site-form" class="uk-form-stacked uk-margin-top">
                    <div class="uk-grid-small" uk-grid>
                        <div class="uk-width-1-2@s">
                            <label class="kp-label">Site Name</label>
                            <input class="uk-input kp-input" name="name" type="text" placeholder="mysite" required>
                        </div>
                        <div class="uk-width-1-2@s">
                            <label class="kp-label">Site Type</label>
                            <select class="uk-select kp-select" name="site_type" id="cs-site-type">
                                <option value="1">PHP</option>
                                <option value="3">Static HTML</option>
                                <option value="4">Node.js</option>
                                <option value="5">.NET</option>
                                <option value="7">Python</option>                                
                                <option value="6">Reverse Proxy</option>
                            </select>
                        </div>
                        <div class="uk-width-1-2@s" id="cs-php-version-wrap">
                            <label class="kp-label">PHP Version</label>
                            <select class="uk-select kp-select" name="php_version">
                                <option value="3" selected>PHP 8.2</option>
                                <option value="4">PHP 8.3</option>
                                <option value="5">PHP 8.4</option>
                                <option value="6">PHP 8.5</option>
                            </select>
                        </div>
                        <div class="uk-width-1-2@s uk-hidden" id="cs-node-version-wrap">
                            <label class="kp-label">Node.js Version</label>
                            <select class="uk-select kp-select" name="node_version">
                                <option value="2" selected>Node 22 (LTS)</option>
                                <option value="4">Node 24</option>
                                <option value="5">Node 25</option>
                                <option value="6">Node 26</option>
                            </select>
                        </div>
                        <div class="uk-width-1-2@s uk-hidden" id="cs-dotnet-version-wrap">
                            <label class="kp-label">.NET Version</label>
                            <select class="uk-select kp-select" name="dotnet_version">
                                <option value="1">.NET 8.0 (LTS)</option>
                                <option value="2">.NET 9.0</option>
                                <option value="3" selected>.NET 10.0 (LTS)</option>
                            </select>
                        </div>
                        <div class="uk-width-1-2@s uk-hidden" id="cs-python-version-wrap">
                            <label class="kp-label">Python Version</label>
                            <select class="uk-select kp-select" name="python_version">
                                <option value="1">Python 3.11</option>
                                <option value="2">Python 3.12</option>
                                <option value="3">Python 3.13</option>
                                <option value="4" selected>Python 3.14</option>
                            </select>
                        </div>
                        <div class="uk-width-1-1 uk-hidden" id="cs-start-command-wrap">
                            <label class="kp-label">Start Command</label>
                            <input class="uk-input kp-input" name="start_command" type="text" placeholder="node server.js, dotnet MyApp.dll, or gunicorn -b 0.0.0.0:8000 app:app">
                        </div>
                        <div class="uk-width-1-1" id="cs-wordpress-wrap">
                            <label><input class="uk-checkbox" type="checkbox" name="install_wordpress" checked> Install WordPress</label>
                        </div>
                        <div class="uk-width-1-1" id="cs-domains-wrap">
                            <label class="kp-label">Domains (one per line)</label>
                            <textarea class="uk-textarea kp-textarea" name="domains" rows="3" placeholder="example.com&#10;www.example.com"></textarea>
                        </div>
                        <div class="uk-width-1-1 uk-hidden" id="cs-rp-note">
                            <p class="kp-muted uk-text-small">Configure domain \u2192 upstream mappings in the Routes tab after creation.</p>
                        </div>
                    </div>
                    <div class="uk-flex uk-flex-right uk-margin-top" style="gap:8px">
                        <button type="button" class="uk-button kp-btn-ghost uk-modal-close">Cancel</button>
                        <button type="submit" class="uk-button kp-btn-primary">
                            <span uk-icon="server"></span> Create Site
                        </button>
                    </div>
                </form>
            </div>
        </div>`);let e=UIkit.modal("#kp-create-site-modal"),s=document.getElementById("cs-site-type"),a=document.getElementById("cs-php-version-wrap"),o=document.getElementById("cs-node-version-wrap"),n=document.getElementById("cs-dotnet-version-wrap"),r=document.getElementById("cs-python-version-wrap"),i=document.getElementById("cs-start-command-wrap"),l=document.getElementById("cs-wordpress-wrap");e.show();let d=document.getElementById("cs-domains-wrap"),k=document.getElementById("cs-rp-note");s.addEventListener("change",()=>{let b=parseInt(s.value);a.classList.toggle("uk-hidden",b!==1&&b!==2||b===6),o.classList.toggle("uk-hidden",b!==4),n.classList.toggle("uk-hidden",b!==5),r.classList.toggle("uk-hidden",b!==7),i.classList.toggle("uk-hidden",b!==4&&b!==5&&b!==7),i.querySelector("input").required=b===7,l.classList.toggle("uk-hidden",b!==1||b===6),d.classList.toggle("uk-hidden",b===6),k.classList.toggle("uk-hidden",b!==6)}),document.getElementById("create-site-form").addEventListener("submit",async b=>{b.preventDefault();let u=b.target.querySelector('[type="submit"]'),p=u.innerHTML;u.disabled=!0,u.innerHTML='<div uk-spinner="ratio: 0.6"></div> Creating...';let v=new FormData(b.target),h=parseInt(v.get("site_type")),f=null;h===4&&(f=parseInt(v.get("node_version"))),h===5&&(f=parseInt(v.get("dotnet_version"))),h===7&&(f=parseInt(v.get("python_version")));let w={name:v.get("name").trim(),php_version:parseInt(v.get("php_version"))||3,site_type:h,runtime_version:f,start_command:v.get("start_command")?.trim()||"",domains:v.get("domains").split(`
`).map(T=>T.trim()).filter(Boolean),install_wordpress:h===1?v.get("install_wordpress")==="on":!1};e.hide(),document.getElementById("kp-create-site-modal")?.remove();let S=h===6?`Setting up '${w.name}' as a reverse proxy...`:`Setting up '${w.name}' \u2014 pulling images and provisioning containers...`;$("Creating Site",S);try{await m.post("/sites",w,6e5),x(),c.success(`Site '${w.name}' created`),y.go("sites")}catch(T){x(),c.error(T.message),u.disabled=!1,u.innerHTML=p}}),document.getElementById("kp-create-site-modal").addEventListener("hidden",()=>document.getElementById("kp-create-site-modal")?.remove())}var U=null;function Ie(t){return`${t.toFixed(1)}%`}var it=null;function kt(){return it||(it=new Promise(t=>{if(window.Chart){t();return}let e=document.createElement("script");e.src="https://cdn.jsdelivr.net/npm/chart.js@latest/dist/chart.umd.min.js",e.onload=t,e.onerror=t,document.body.appendChild(e)}),it)}function bt(t,e){return`
        <div id="stats-panel" data-site-id="${t}" data-site-type="${e}">

            <!-- traffic -->
            <div class="kp-card uk-padding-small uk-margin-bottom">
                <h3 class="kp-view-title uk-margin-small-bottom">Site Traffic
                    <span class="kp-muted uk-text-small" style="font-weight:400"> \u2014 last 24 hours</span>
                </h3>

                <!-- status code badges -->
                <div class="uk-grid-small uk-child-width-1-2 uk-child-width-1-4@m uk-margin-small-bottom" uk-grid>
                    <div><div class="kp-stat-card" style="padding:16px">
                        <div class="kp-stat-value" id="stats-2xx" style="font-size:1.6rem">\u2014</div>
                        <div class="kp-stat-label" style="color:var(--kp-success)">2xx Success</div>
                    </div></div>
                    <div><div class="kp-stat-card" style="padding:16px">
                        <div class="kp-stat-value" id="stats-3xx" style="font-size:1.6rem">\u2014</div>
                        <div class="kp-stat-label" style="color:var(--kp-cyan)">3xx Redirect</div>
                    </div></div>
                    <div><div class="kp-stat-card" style="padding:16px">
                        <div class="kp-stat-value" id="stats-4xx" style="font-size:1.6rem">\u2014</div>
                        <div class="kp-stat-label" style="color:var(--kp-warning)">4xx Client Err</div>
                    </div></div>
                    <div><div class="kp-stat-card" style="padding:16px">
                        <div class="kp-stat-value" id="stats-5xx" style="font-size:1.6rem">\u2014</div>
                        <div class="kp-stat-label" style="color:var(--kp-danger)">5xx Server Err</div>
                    </div></div>
                </div>

                <!-- bandwidth -->
                <div class="kp-stats-bandwidth">
                    Total Bandwidth: <span id="stats-bandwidth" class="kp-stats-bandwidth-val">\u2014</span>
                </div>

                <!-- hits per hour chart -->
                <div class="kp-stats-chart-wrap">
                    <canvas id="stats-chart"></canvas>
                </div>
            </div>

            <!-- drilldown modal \u2014 populated on 4xx/5xx bar click -->
            <div id="stats-drilldown-modal" uk-modal>
                <div class="uk-modal-dialog uk-modal-body" style="min-width:min(96vw,900px)">
                    <button class="uk-modal-close-default" type="button" uk-close></button>
                    <h3 class="kp-view-title uk-margin-small-bottom" id="stats-drilldown-title">Request Detail</h3>
                    <div id="stats-drilldown-body">
                        <div uk-spinner="ratio:0.8" style="color:var(--kp-blue)"></div>
                    </div>
                </div>
            </div>

            <!-- top IPs + UAs -->
            <div class="uk-grid-small uk-child-width-1-1 uk-child-width-1-2@m uk-margin-bottom" uk-grid>
                <div>
                    <div class="kp-table-wrap">
                        <table class="uk-table uk-table-small uk-table-divider uk-margin-remove">
                            <thead><tr>
                                <th style="color:var(--kp-text-dim);font-size:0.75rem">Top IPs</th>
                                <th style="color:var(--kp-text-dim);font-size:0.75rem;text-align:right">Hits</th>
                            </tr></thead>
                            <tbody id="stats-ip-rows">
                                <tr><td colspan="2" class="kp-muted uk-text-small">Loading\u2026</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
                <div>
                    <div class="kp-table-wrap">
                        <table class="uk-table uk-table-small uk-table-divider uk-margin-remove">
                            <thead><tr>
                                <th style="color:var(--kp-text-dim);font-size:0.75rem">Top User-Agents</th>
                                <th style="color:var(--kp-text-dim);font-size:0.75rem;text-align:right">Hits</th>
                            </tr></thead>
                            <tbody id="stats-ua-rows">
                                <tr><td colspan="2" class="kp-muted uk-text-small">Loading\u2026</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            ${e===6?"":`
        <!-- pod statistics -->
        <div class="kp-card uk-padding-small uk-margin-bottom">
            <div class="uk-flex uk-flex-between uk-flex-middle uk-margin-small-bottom">
                <h3 class="kp-view-title">Pod Statistics</h3>
                <span id="stats-pod-indicator" class="kp-status kp-status-stopped" style="font-size:0.7rem">
                    Connecting\u2026
                </span>
            </div>
            <div id="stats-pod-table-wrap">
                <div uk-spinner="ratio:0.8" style="color:var(--kp-blue)"></div>
            </div>
        </div>

        <!-- disk usage -->
        <div class="kp-card uk-padding-small uk-margin-bottom">
            <div class="uk-flex uk-flex-between uk-flex-middle uk-margin-small-bottom">
                <h3 class="kp-view-title">Disk Usage</h3>
                <button class="uk-button kp-btn-ghost kp-btn-sm" id="stats-disk-refresh"
                    uk-tooltip="Refresh disk usage">
                    <span uk-icon="refresh"></span>
                </button>
            </div>
            <div id="stats-disk-wrap">
                <div uk-spinner="ratio:0.8" style="color:var(--kp-blue)"></div>
            </div>
        </div>`}

        </div>`}async function Be(t){await kt();let e;try{e=await m.get(`/sites/${t}/stats/traffic`)}catch(n){document.getElementById("stats-ip-rows").innerHTML=`<tr><td colspan="2" class="kp-muted uk-text-small">Failed to load: ${n.message}</td></tr>`;return}document.getElementById("stats-2xx").textContent=(e.status_codes["2xx"]??0).toLocaleString(),document.getElementById("stats-3xx").textContent=(e.status_codes["3xx"]??0).toLocaleString(),document.getElementById("stats-4xx").textContent=(e.status_codes["4xx"]??0).toLocaleString(),document.getElementById("stats-5xx").textContent=(e.status_codes["5xx"]??0).toLocaleString(),document.getElementById("stats-bandwidth").textContent=E(e.total_bandwidth??0);let s=document.getElementById("stats-chart");if(s&&window.Chart){let n=(e.hits_per_hour??[]).map(i=>new Date(i.hour).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}));U&&(U.destroy(),U=null),U=new window.Chart(s,{type:"bar",data:{labels:n,datasets:[{label:"2xx",data:(e.hits_per_hour??[]).map(i=>i["2xx"]),backgroundColor:"rgba(39,174,96,0.75)",borderColor:"rgba(39,174,96,1)",borderWidth:1,borderRadius:3},{label:"3xx",data:(e.hits_per_hour??[]).map(i=>i["3xx"]),backgroundColor:"rgba(43,142,255,0.75)",borderColor:"rgba(43,142,255,1)",borderWidth:1,borderRadius:3},{label:"4xx",data:(e.hits_per_hour??[]).map(i=>i["4xx"]),backgroundColor:"rgba(255,171,0,0.75)",borderColor:"rgba(255,171,0,1)",borderWidth:1,borderRadius:3},{label:"5xx",data:(e.hits_per_hour??[]).map(i=>i["5xx"]),backgroundColor:"rgba(235,59,90,0.75)",borderColor:"rgba(235,59,90,1)",borderWidth:1,borderRadius:3}]},options:{responsive:!0,maintainAspectRatio:!1,onClick:(i,l)=>{if(!l||!l.length)return;let d=l[0].datasetIndex,k=U.data.datasets[d].label;if(k!=="4xx"&&k!=="5xx")return;let b=l[0].index,u=document.getElementById("stats-panel");if(!u||!u._hitsPerHour)return;let p=u._hitsPerHour[b]?.hour;p&&vt(`/sites/${t}/stats/drilldown`,p,k)},onHover:(i,l)=>{if(!l||!l.length){i.native.target.style.cursor="default";return}let d=U.data.datasets[l[0].datasetIndex].label;i.native.target.style.cursor=d==="4xx"||d==="5xx"?"pointer":"default"},plugins:{legend:{display:!0,labels:{color:"#6b8cae",font:{size:11}},onHover:i=>{i.native.target.style.cursor="pointer"},onLeave:i=>{i.native.target.style.cursor="default"}},tooltip:{mode:"index",backgroundColor:"#0c1530",borderColor:"#1a2a4a",borderWidth:1,titleColor:"#dde8f5",bodyColor:"#6b8cae"}},scales:{x:{stacked:!0,ticks:{color:"#6b8cae",font:{size:10},maxRotation:45},grid:{color:"rgba(26,42,74,0.6)"}},y:{stacked:!0,ticks:{color:"#6b8cae",font:{size:10}},grid:{color:"rgba(26,42,74,0.6)"},beginAtZero:!0}}}});let r=document.getElementById("stats-panel");r&&(r._hitsPerHour=e.hits_per_hour??[])}let a=document.getElementById("stats-ip-rows");a&&(a.innerHTML=(e.top_ips??[]).length===0?'<tr><td colspan="2" class="kp-muted uk-text-small">No data</td></tr>':(e.top_ips??[]).map(n=>`
                <tr>
                    <td class="kp-stats-table-cell-mono">${g(n.name)}</td>
                    <td class="kp-stats-table-cell-count">${n.count.toLocaleString()}</td>
                </tr>`).join(""));let o=document.getElementById("stats-ua-rows");o&&(o.innerHTML=(e.top_uas??[]).length===0?'<tr><td colspan="2" class="kp-muted uk-text-small">No data</td></tr>':(e.top_uas??[]).map(n=>`
                <tr>
                    <td class="kp-stats-ua-cell" title="${g(n.name)}">${g(n.name)}</td>
                    <td class="kp-stats-table-cell-count">${n.count.toLocaleString()}</td>
                </tr>`).join(""))}async function Mt(t){let e=document.getElementById("stats-disk-wrap");if(e){e.innerHTML='<div uk-spinner="ratio:0.8" style="color:var(--kp-blue)"></div>';try{let s=await m.get(`/sites/${t}/stats/disk`);e.innerHTML=`
            <div class="uk-grid-small uk-child-width-1-2" uk-grid>
                <div>
                    <div class="kp-stat-card" style="padding:16px">
                        <div class="kp-stat-value kp-stats-disk-val">${E(s.html_bytes??0)}</div>
                        <div class="kp-stat-label">Site Files</div>
                    </div>
                </div>
                <div>
                    <div class="kp-stat-card" style="padding:16px">
                        <div class="kp-stat-value kp-stats-disk-val">${E(s.db_bytes??0)}</div>
                        <div class="kp-stat-label">Database</div>
                    </div>
                </div>
            </div>`}catch(s){e.innerHTML=`<p class="kp-muted uk-text-small">Failed to load disk usage: ${s.message}</p>`}}}function qe(t){return!t||t.length===0?'<p class="kp-muted uk-text-small uk-margin-remove">No container data.</p>':`
        <table class="uk-table uk-table-small uk-table-divider uk-margin-remove">
            <thead><tr>
                <th style="color:var(--kp-text-dim);font-size:0.75rem">Container</th>
                <th style="color:var(--kp-text-dim);font-size:0.75rem">CPU</th>
                <th style="color:var(--kp-text-dim);font-size:0.75rem">Memory</th>
                <th style="color:var(--kp-text-dim);font-size:0.75rem">Mem %</th>
            </tr></thead>
            <tbody>${t.map(s=>{let a=s.mem_limit>0?(s.mem_used/s.mem_limit*100).toFixed(1):0,o=a>80,n=s.name.split("-").pop();return`
            <tr>
                <td class="kp-stats-pod-role kp-stats-pod-role-btn"
                    data-container="${s.name}"
                    title="Restart ${n}"
                    style="cursor:pointer">${n}</td>
                <td class="kp-stats-pod-cpu${s.cpu_percent>80?" is-hot":""}">
                    ${Ie(s.cpu_percent)}
                </td>
                <td class="kp-stats-pod-mem">
                    ${E(s.mem_used)}
                    <span class="kp-stats-pod-mem-limit"> / ${E(s.mem_limit)}</span>
                </td>
                <td>
                    <div class="kp-stats-mem-wrap">
                        <div class="kp-stats-mem-bar-track">
                            <div class="kp-stats-mem-bar-fill${o?" is-hot":""}"
                                style="width:${a}%"></div>
                        </div>
                        <span class="kp-stats-mem-pct">${a}%</span>
                    </div>
                </td>
            </tr>`}).join("")}</tbody>
        </table>`}function Me(t,e,s,a,o){if(!t||t.length===0)return'<p class="kp-muted uk-text-small">No matching requests found.</p>';let n=[...t].sort((b,u)=>{let p,v;switch(s){case"time":p=b.time,v=u.time;break;case"method":p=b.method,v=u.method;break;case"site":p=b.site_name,v=u.site_name;break;case"ip":p=b.client_ip,v=u.client_ip;break;default:p=b.status,v=u.status;break}return p<v?a?1:-1:p>v?a?-1:1:0}),r=50,i=Math.ceil(n.length/r),d=n.slice(e*r,(e+1)*r).map(b=>{let u=g(b.ua),p=b.status>=500?"kp-badge-danger":"kp-badge-warning";return`
            <tr>
                <td class="kp-stats-table-cell-mono" style="white-space:nowrap">${b.time.slice(11,19)}</td>
                ${o?`<td class="kp-stats-table-cell-mono" style="font-size:0.8rem">${g(b.site_name)}</td>`:""}
                <td class="kp-stats-table-cell-mono">${g(b.method)}</td>
                <td style="word-break:break-all;font-size:0.8rem">${g(b.path)}</td>
                <td><span class="kp-badge ${p}">${b.status}</span>${b.reason?` <span class="kp-badge kp-badge-danger" style="font-size:0.65rem" uk-tooltip="Blocked by security rule">${g(b.reason)}</span>`:""}</td>
                <td class="kp-stats-table-cell-mono">${g(b.client_ip)}</td>
                <td class="kp-dd-ua-cell">${u}</td>
            </tr>`}).join(""),k=i>1?`
        <div class="uk-flex uk-flex-between uk-flex-middle uk-margin-small-top">
            <span class="kp-muted uk-text-small">Page ${e+1} of ${i} \u2014 ${t.length} total</span>
            <div>
                ${e>0?`<button class="uk-button kp-btn-ghost kp-btn-sm" data-dd-page="${e-1}">\u2039 Prev</button>`:""}
                ${e<i-1?`<button class="uk-button kp-btn-ghost kp-btn-sm" data-dd-page="${e+1}">Next \u203A</button>`:""}
            </div>
        </div>`:"";return`
        <div class="kp-table-wrap uk-overflow-auto">
            <table class="uk-table uk-table-small uk-table-divider uk-margin-remove">
                <thead><tr>
                    <th style="color:var(--kp-text-dim);font-size:0.75rem;cursor:pointer;user-select:none" data-dd-col="time">Time ${s==="time"?a?"\u2193":"\u2191":"\u2195"}</th>
                    ${o?`<th style="color:var(--kp-text-dim);font-size:0.75rem;cursor:pointer;user-select:none" data-dd-col="site">Site ${s==="site"?a?"\u2193":"\u2191":"\u2195"}</th>`:""}
                    <th style="color:var(--kp-text-dim);font-size:0.75rem;cursor:pointer;user-select:none" data-dd-col="method">Method ${s==="method"?a?"\u2193":"\u2191":"\u2195"}</th>
                    <th style="color:var(--kp-text-dim);font-size:0.75rem">Path</th>
                    <th style="color:var(--kp-text-dim);font-size:0.75rem;cursor:pointer;user-select:none" data-dd-col="status">Status ${s==="status"?a?"\u2193":"\u2191":"\u2195"}</th>
                    <th style="color:var(--kp-text-dim);font-size:0.75rem;cursor:pointer;user-select:none" data-dd-col="ip">IP ${s==="ip"?a?"\u2193":"\u2191":"\u2195"}</th>
                    <th style="color:var(--kp-text-dim);font-size:0.75rem">UA</th>
                </tr></thead>
                <tbody>${d}</tbody>
            </table>
        </div>
        ${k}`}async function vt(t,e,s,a=!1){let o=document.getElementById("stats-drilldown-modal"),n=document.getElementById("stats-drilldown-title"),r=document.getElementById("stats-drilldown-body");if(!o||!r)return;n.textContent=`${s} Requests \u2014 ${new Date(e).toLocaleString([],{hour:"2-digit",minute:"2-digit",month:"short",day:"numeric"})}`,r.innerHTML='<div uk-spinner="ratio:0.8" style="color:var(--kp-blue)"></div>',UIkit.modal(o).show();let i=[],l=0,d="time",k=!0;function b(){r.innerHTML=Me(i,l,d,k,a),r.querySelectorAll("th[data-dd-col]").forEach(u=>{u.addEventListener("click",()=>{let p=u.dataset.ddCol;d===p?k=!k:(d=p,k=!0),l=0,b()})}),r.querySelectorAll("[data-dd-page]").forEach(u=>{u.addEventListener("click",()=>{l=parseInt(u.dataset.ddPage,10),b()})})}try{i=await m.get(`${t}?hour=${encodeURIComponent(e)}&status=${s}`)}catch(u){r.innerHTML=`<p class="kp-muted uk-text-small">Failed to load: ${g(u.message)}</p>`;return}b()}function ht(t,e,s){let a=s===6,o=null;function n(){if(a)return;let l=t.querySelector("#stats-pod-indicator"),d=t.querySelector("#stats-pod-table-wrap");if(!d)return;let k=location.protocol==="https:"?"wss":"ws";o=new WebSocket(`${k}://${location.host}/api/sites/${e}/stats/pod`),o.onopen=()=>{l&&(l.className="kp-status kp-status-running",l.textContent="Live")},o.onmessage=b=>{try{let u=JSON.parse(b.data);d.innerHTML=qe(u.containers??[]),d.querySelectorAll(".kp-stats-pod-role-btn").forEach(p=>{p.addEventListener("click",async()=>{let v=p.style.color;p.style.color="var(--kp-warning)";let h=p.dataset.container.split("-").pop();try{await m.post(`/sites/${e}/containers/${h}/restart`),c.success(`${h} restarted`)}catch(f){p.style.color=v,c.error(f.message)}})})}catch{}},o.onerror=()=>{l&&(l.className="kp-status kp-status-error",l.textContent="Error")},o.onclose=()=>{l&&l.textContent==="Live"&&(l.className="kp-status kp-status-stopped",l.textContent="Disconnected")}}function r(){o&&o.readyState===WebSocket.OPEN&&o.close(),o=null}t.querySelector("#stats-disk-refresh")?.addEventListener("click",()=>{Mt(e)}),n();let i=new MutationObserver(()=>{document.getElementById("stats-panel")||(r(),i.disconnect())});i.observe(document.getElementById("main")??document.body,{childList:!0,subtree:!1})}async function gt(t,e){let s=e===6;await Be(t),s||await Mt(t)}async function At(t){let e=await m.get("/sites")??[];t.innerHTML=`
        <div class="kp-view-header">
            <h1 class="kp-view-title kp-cursor" style="font-size:2rem;">Sites</h1>
            <button class="uk-button kp-btn-primary" id="sites-new-btn" uk-tooltip="Create a New Site">
                <span uk-icon="plus"></span> New
            </button>
        </div>

        <!-- bulk action bar \u2014 always visible -->
        <div id="sites-bulk-bar" class="kp-bulk-bar">
            <div class="kp-bulk-actions">
                <span id="sites-bulk-count" class="kp-bulk-count">0 selected</span>
                <!-- desktop: individual buttons (hidden on mobile) -->
                <button class="uk-button kp-btn-secondary kp-btn-sm uk-visible@s" id="bulk-start" uk-tooltip="Start the Pod(s)" disabled>
                    <span uk-icon="play"></span>
                </button>
                <button class="uk-button kp-btn-secondary kp-btn-sm uk-visible@s" id="bulk-stop" uk-tooltip="Stop the Pod(s)" disabled>
                    <span uk-icon="ban"></span>
                </button>
                <button class="uk-button kp-btn-secondary kp-btn-sm uk-visible@s" id="bulk-restart" uk-tooltip="Restart the Pod(s)" disabled>
                    <span uk-icon="refresh"></span>
                </button>
                <button class="uk-button kp-btn-secondary kp-btn-sm uk-visible@s" id="bulk-flush" uk-tooltip="Flush the Pod Cache(s)" disabled>
                    <span uk-icon="bolt"></span>
                </button>
                <!-- separator + dangerous bulk action -->
                <span class="uk-visible@s kp-vert-sep" aria-hidden="true"></span>
                <button class="uk-button kp-btn-danger kp-btn-recreate kp-btn-sm uk-visible@s" id="bulk-recreate" uk-tooltip="Recreate the Pod(s)" disabled>
                    <span uk-icon="cloud-download"></span>
                </button>
                <!-- mobile: actions dropdown (hidden on desktop), mirrors Manage dropdown -->
                <li id="kp-bulk-mobile-pill" class="uk-hidden@s" style="position:relative;list-style:none">
                    <a href="javascript:void(0);" class="kp-pill-dropdown-btn" id="kp-bulk-mobile-btn">
                        Actions <span uk-icon="icon: chevron-down; ratio: 0.8"></span>
                    </a>
                    <div class="kp-pill-dropdown" id="kp-bulk-mobile-dropdown" hidden>
                        <a href="#" id="bulk-mobile-start"><span uk-icon="icon: play; ratio: 0.85"></span> Start</a>
                        <a href="#" id="bulk-mobile-stop"><span uk-icon="icon: ban; ratio: 0.85"></span> Stop</a>
                        <a href="#" id="bulk-mobile-restart"><span uk-icon="icon: refresh; ratio: 0.85"></span> Restart</a>
                        <a href="#" id="bulk-mobile-flush"><span uk-icon="icon: bolt; ratio: 0.85"></span> Flush Caches</a>
                        <a href="#" id="bulk-mobile-recreate"><span uk-icon="icon: cloud-download; ratio: 0.85"></span> Recreate</a>
                    </div>
                </li>
            </div>
            <input class="uk-input kp-input kp-input-sm kp-sites-search"
                   id="sites-search" type="text" placeholder="Filter sites\u2026" autocomplete="off">
        </div>

        ${e.length===0?et("world","No sites yet \u2014 create one to get started"):`<div class="kp-table-wrap">
                <div class="uk-overflow-auto">
                    <table class="uk-table uk-table-hover uk-table-divider uk-table-small uk-margin-remove">
                        <thead>
                            <tr>
                                <th class="uk-table-shrink">
                                    <input class="uk-checkbox" type="checkbox" id="sites-select-all" uk-tooltip="Select All">
                                </th>
                                <th class="kp-sortable" data-col="status">Status <span class="kp-sort-icon" data-col="status"></span></th>
                                <th class="kp-sortable" data-col="name">Name <span class="kp-sort-icon" data-col="name"></span></th>
                                <th class="uk-visible@s kp-sortable" data-col="type">Type <span class="kp-sort-icon" data-col="type"></span></th>
                                <th class="uk-visible@m">Port</th>
                                <th class="uk-visible@m">UID</th>
                                <th class="uk-visible@m kp-sortable" data-col="domain">Domain <span class="kp-sort-icon" data-col="domain"></span></th>
                                <th class="uk-table-shrink">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${e.map(s=>Ae(s,e)).join("")}
                        </tbody>
                    </table>
                </div>
            </div>`}`,document.getElementById("sites-new-btn").addEventListener("click",()=>ot()),He()}function Ae(t,e=[]){let s=t.Domains?.[0]??null,a=t.SiteType===6,o=t.ParentID>0?e.find(n=>n.ID===t.ParentID)??null:null;return`
        <tr data-site-id="${t.ID}" data-status="${a?"":t.SiteStatus}" data-type="${t.SiteType}">
            <!-- row checkbox -->
            <td class="uk-table-shrink">
                <input class="uk-checkbox kp-site-row-check" type="checkbox"
                       data-site-id="${t.ID}" data-site-type="${t.SiteType}">
            </td>
            <!-- status badge -->
            <td class="uk-table-shrink kp-site-row-status">${a?"":H(t.SiteStatus)}</td>

            <!-- name + optional parent clone link -->
            <td>
                <a class="kp-site-row-name" href="javascript:void(0)"
                   data-action="manage" data-id="${t.ID}">${t.Name}</a>
                ${o?`<div class="kp-muted uk-text-small kp-mono">
                           <span uk-icon="icon: git-fork; ratio: 0.7"></span>
                           <a href="javascript:void(0)" data-action="manage" data-id="${o.ID}"
                              style="color:var(--kp-cyan)">${o.Name}</a>
                       </div>`:""}
            </td>

            <!-- type / runtime version -->
            <td class="uk-visible@s kp-muted kp-mono uk-text-small">
                ${V(t.SiteType)}${R(t)?" / "+R(t):""}
            </td>

            <!-- internal port -->
            <td class="uk-visible@m kp-muted kp-mono uk-text-small">:${t.Port}</td>

            <!-- host-mapped owner UID of html/ -->
            <td class="uk-visible@m kp-muted kp-mono uk-text-small">${t.HostUID??(a?"":"\u2014")}</td>

            <!-- primary domain -->
            <td class="uk-visible@m uk-text-small">
                ${s?`<a href="http://${s}" target="_blank"
                          style="color:var(--kp-cyan)">${s}</a>`:'<span class="kp-muted">\u2014</span>'}
            </td>

            <!-- action buttons -->
            <td class="uk-table-shrink">
                <div class="kp-site-row-actions">
                    <button class="uk-button kp-btn-secondary kp-btn-sm"
                            data-action="manage" data-id="${t.ID}"
                            uk-tooltip="Manage">
                        <span uk-icon="icon: cog;"></span>
                    </button>
                    ${a?"":`
                    ${t.SiteStatus===1?`<button class="uk-button kp-btn-secondary kp-btn-sm"
                                   data-action="stop" data-id="${t.ID}"
                                   uk-tooltip="Stop">
                               <span uk-icon="icon: ban;"></span>
                           </button>`:`<button class="uk-button kp-btn-secondary kp-btn-sm"
                                   data-action="start" data-id="${t.ID}"
                                   uk-tooltip="Start">
                               <span uk-icon="icon: play;"></span>
                           </button>`}
                    <button class="uk-button kp-btn-secondary kp-btn-sm"
                            data-action="restart" data-id="${t.ID}"
                            uk-tooltip="Restart">
                        <span uk-icon="icon: refresh;"></span>
                    </button>
                    <button class="uk-button kp-btn-secondary kp-btn-sm"
                            data-action="flush" data-id="${t.ID}"
                            uk-tooltip="Flush Caches">
                        <span uk-icon="icon: bolt;"></span>
                    </button>
                    <button class="uk-button kp-btn-ghost kp-btn-sm kp-btn-recreate"
                            data-action="recreate" data-id="${t.ID}"
                            uk-tooltip="Recreate Pod">
                        <span uk-icon="icon: history;"></span>
                    </button>
                    `}
                    <button class="uk-button kp-btn-ghost kp-btn-sm kp-btn-recreate"
                            data-action="delete" data-id="${t.ID}"
                            uk-tooltip="Delete">
                        <span uk-icon="icon: trash;"></span>
                    </button>
                </div>
            </td>
        </tr>`}function Ht(t,e=[]){let s=t.Domains?.[0]??null,a=t.SiteType===6,o=t.ParentID>0?e.find(n=>n.ID===t.ParentID)??null:null;return`
        <div class="kp-site-card uk-margin" data-site-id="${t.ID}" data-status="${a?"":t.SiteStatus}" data-type="${t.SiteType}">
            <div class="kp-site-card-header">
                <div>
                    <h2 class="kp-view-title" data-action="manage" data-id="${t.ID}">${t.Name}</h2>
                    <div class="kp-site-meta">
                        <span class="kp-site-meta-item"><span uk-icon="icon: server; ratio: 0.75"></span> :${t.Port}</span>
                        <span class="kp-site-meta-item"><span uk-icon="icon: code; ratio: 0.75"></span> ${V(t.SiteType)}${R(t)?" / "+R(t):""}</span>
                        ${s?`<span class="kp-site-meta-item" style="width:100%"><a href="http://${s}" target="_blank" style="color:var(--kp-cyan)">${s}</a></span>`:""}
                    </div>
                    ${o?`<div class="kp-site-meta kp-muted uk-text-small uk-margin-small-top"><span uk-icon="icon: git-fork; ratio: 0.75"></span> <a href="javascript:void(0)" data-action="manage" data-id="${o.ID}" style="color:var(--kp-cyan)">${o.Name}</a></div>`:""}
                </div>
                ${a?"":H(t.SiteStatus)}
            </div>
            <div class="kp-site-actions">
                <button class="uk-button kp-btn-secondary kp-btn-sm" data-action="manage" data-id="${t.ID}" uk-tooltip="Manage This Site"><span uk-icon="icon: cog;"></span></button>
                ${a?"":`
                ${t.SiteStatus===1?`<button class="uk-button kp-btn-secondary kp-btn-sm" data-action="stop" data-id="${t.ID}" uk-tooltip="Stop the Site"><span uk-icon="icon: ban;"></span></button>`:`<button class="uk-button kp-btn-secondary kp-btn-sm" data-action="start" data-id="${t.ID}" uk-tooltip="Start the Site"><span uk-icon="icon: play;"></span></button>`}
                <button class="uk-button kp-btn-secondary kp-btn-sm" data-action="restart" data-id="${t.ID}" uk-tooltip="Restart the Site"><span uk-icon="icon: refresh;"></span></button>
                <button class="uk-button kp-btn-secondary kp-btn-sm" data-action="flush" data-id="${t.ID}" title="Flush cache" uk-tooltip="Flush the Caches"><span uk-icon="icon: bolt;"></span></button>
                <div class="kp-site-actions-break"></div>
                <button class="uk-button kp-btn-ghost kp-btn-sm" data-action="recreate" data-id="${t.ID}" title="Recreate pod" uk-tooltip="Recreate the Pod"><span uk-icon="icon: history;"></span></button>
                `}
                <button class="uk-button kp-btn-ghost kp-btn-sm" data-action="delete" data-id="${t.ID}" title="Delete" uk-tooltip="Delete the Site"><span uk-icon="icon: trash;"></span></button>
            </div>
        </div>`}function He(){let t=document.getElementById("sites-bulk-bar"),e=document.getElementById("sites-bulk-count"),s=document.getElementById("sites-select-all"),a=document.getElementById("sites-search"),o=document.querySelector(".kp-table-wrap tbody");if(!t||!s)return;let n=null,r=!0,i=()=>[...document.querySelectorAll(".kp-site-row-check:checked")],l=()=>{let v=i().length;e.textContent=`${v} selected`,["bulk-start","bulk-stop","bulk-restart","bulk-flush","bulk-recreate"].forEach(w=>{let S=document.getElementById(w);S&&(S.disabled=v===0)});let h=document.getElementById("kp-bulk-mobile-btn");h&&(h.disabled=v===0);let f=document.querySelectorAll(".kp-site-row-check");s.indeterminate=v>0&&v<f.length,s.checked=f.length>0&&v===f.length},d=()=>{let p=a.value.trim().toLowerCase();document.querySelectorAll(".kp-table-wrap tbody tr").forEach(v=>{let h=v.querySelector(".kp-site-row-name")?.textContent.toLowerCase()??"",f=v.querySelector("td:nth-child(6)")?.textContent.toLowerCase()??"";v.style.display=!p||h.includes(p)||f.includes(p)?"":"none"})},k=p=>{n===p?r=!r:(n=p,r=!0),document.querySelectorAll(".kp-sort-icon").forEach(h=>{h.textContent=h.dataset.col===p?r?" \u2191":" \u2193":" \u2195"});let v=[...o.querySelectorAll("tr")];v.sort((h,f)=>{let w="",S="";return p==="name"?(w=h.querySelector(".kp-site-row-name")?.textContent??"",S=f.querySelector(".kp-site-row-name")?.textContent??""):p==="status"?(w=h.dataset.status??"",S=f.dataset.status??""):p==="type"?(w=h.dataset.type??"",S=f.dataset.type??""):p==="domain"&&(w=h.querySelector("td:nth-child(6)")?.textContent.trim()??"",S=f.querySelector("td:nth-child(6)")?.textContent.trim()??""),r?w.localeCompare(S):S.localeCompare(w)}),v.forEach(h=>o.appendChild(h))};s.addEventListener("change",()=>{document.querySelectorAll(".kp-site-row-check").forEach(p=>{p.checked=s.checked}),l()}),o?.addEventListener("change",p=>{p.target.classList.contains("kp-site-row-check")&&l()}),a?.addEventListener("input",d),document.querySelectorAll(".kp-sortable").forEach(p=>{p.addEventListener("click",()=>k(p.dataset.col))}),["bulk-start","bulk-stop","bulk-restart","bulk-flush","bulk-recreate"].forEach(p=>{let v=p.replace("bulk-","");document.getElementById(p)?.addEventListener("click",()=>{let h=i().filter(f=>f.dataset.siteType!=="6").map(f=>f.dataset.siteId);document.dispatchEvent(new CustomEvent("kp:bulk-action",{detail:{action:v,ids:h}}))})});let b=document.getElementById("kp-bulk-mobile-pill"),u=document.getElementById("kp-bulk-mobile-dropdown");document.getElementById("kp-bulk-mobile-btn")?.addEventListener("click",p=>{p.stopPropagation(),u.hidden=!u.hidden}),document.addEventListener("click",p=>{u&&!b?.contains(p.target)&&(u.hidden=!0)},{capture:!0}),["start","stop","restart","flush","recreate"].forEach(p=>{document.getElementById(`bulk-mobile-${p}`)?.addEventListener("click",v=>{v.preventDefault(),u.hidden=!0;let h=i().filter(f=>f.dataset.siteType!=="6").map(f=>f.dataset.siteId);document.dispatchEvent(new CustomEvent("kp:bulk-action",{detail:{action:p,ids:h}}))})}),document.querySelectorAll(".kp-sort-icon").forEach(p=>{p.textContent=" \u2195"}),l()}var N=null,W=null;function Re(){W&&(W.close(),W=null);let t=(a,o)=>o>0?`${(a/o*100).toFixed(1)}%`:"\u2014",e=location.protocol==="https:"?"wss":"ws",s=new WebSocket(`${e}://${location.host}/api/stats/host`);W=s,s.onmessage=a=>{let o=document.getElementById("dash-host-cpu");if(!o){s.close();return}let n;try{n=JSON.parse(a.data)}catch{return}o.textContent=`${(n.cpu_percent??0).toFixed(1)}%`,document.getElementById("dash-host-mem").textContent=t(n.mem_used,n.mem_total),document.getElementById("dash-host-mem-sub").textContent=`${E(n.mem_used??0)} / ${E(n.mem_total??0)}`,document.getElementById("dash-host-disk").textContent=t(n.disk_used,n.disk_total),document.getElementById("dash-host-disk-sub").textContent=`${E(n.disk_used??0)} / ${E(n.disk_total??0)}`,document.getElementById("dash-host-procs").textContent=(n.procs_running??0).toLocaleString(),document.getElementById("dash-host-procs-sub").textContent=`of ${(n.procs_total??0).toLocaleString()} total`},s.onclose=()=>{W===s&&(W=null)}}async function Rt(t){let[e,s]=await Promise.all([m.get("/sites").catch(()=>[]),m.get("/stats/traffic").catch(()=>null)]),a=e.filter(i=>i.SiteType!==6&&i.SiteStatus===1).length,o=e.filter(i=>i.SiteType===6).length,n=e.filter(i=>i.SiteType!==6&&i.SiteStatus===4).length,r=window.KP?.user?.role===99;if(t.innerHTML=`

        <!-- global counts -->
        <div class="kp-view-header">
            <h1 class="kp-view-title kp-cursor" style="font-size:2rem;">Dashboard</h1>
        </div>
        <div class="uk-grid-small uk-child-width-1-2 uk-child-width-1-4@m uk-margin-medium-bottom" uk-grid>
            <div>
                <div class="kp-stat-card">
                    <div class="uk-flex uk-flex-between">
                        <div>
                            <div class="kp-stat-value">${e.length}</div>
                            <div class="kp-stat-label">Total Sites</div>
                        </div>
                        <span class="kp-stat-icon" uk-icon="icon: world; ratio: 1.75"></span>
                    </div>
                </div>
            </div>
            <div>
                <div class="kp-stat-card">
                    <div class="uk-flex uk-flex-between">
                        <div>
                            <div class="kp-stat-value" style="color:var(--kp-success)">${a}</div>
                            <div class="kp-stat-label">Running</div>
                        </div>
                        <span style="color:var(--kp-success)" uk-icon="icon: check; ratio: 1.75"></span>
                    </div>
                </div>
            </div>
            <div>
                <div class="kp-stat-card">
                    <div class="uk-flex uk-flex-between">
                        <div>
                            <div class="kp-stat-value" style="color:var(--kp-cyan)">${o}</div>
                            <div class="kp-stat-label">Proxies</div>
                        </div>
                        <span style="color:var(--kp-cyan)" uk-icon="icon: link; ratio: 1.75"></span>
                    </div>
                </div>
            </div>
            <div>
                <div class="kp-stat-card">
                    <div class="uk-flex uk-flex-between">
                        <div>
                            <div class="kp-stat-value" style="color:var(--kp-danger)">${n}</div>
                            <div class="kp-stat-label">Errors</div>
                        </div>
                        <span style="color:var(--kp-danger)" uk-icon="icon: warning; ratio: 1.75"></span>
                    </div>
                </div>
            </div>
        </div>

        <!-- live host usage \u2014 admin only -->
        ${r?`
        <div class="uk-grid-small uk-child-width-1-2 uk-child-width-1-4@m uk-margin-medium-bottom" uk-grid>
            <div>
                <div class="kp-stat-card">
                    <div class="uk-flex uk-flex-between">
                        <div>
                            <div class="kp-stat-value" id="dash-host-cpu">\u2014</div>
                            <div class="kp-stat-label">Host CPU</div>
                            <div class="kp-muted uk-text-small kp-mono">&nbsp;</div>
                        </div>
                        <span class="kp-stat-icon" uk-icon="icon: bolt; ratio: 1.75"></span>
                    </div>
                </div>
            </div>
            <div>
                <div class="kp-stat-card">
                    <div class="uk-flex uk-flex-between">
                        <div>
                            <div class="kp-stat-value" id="dash-host-mem">\u2014</div>
                            <div class="kp-stat-label">Host Memory</div>
                            <div class="kp-muted uk-text-small kp-mono" id="dash-host-mem-sub">&nbsp;</div>
                        </div>
                        <span class="kp-stat-icon" uk-icon="icon: server; ratio: 1.75"></span>
                    </div>
                </div>
            </div>
            <div>
                <div class="kp-stat-card">
                    <div class="uk-flex uk-flex-between">
                        <div>
                            <div class="kp-stat-value" id="dash-host-disk">\u2014</div>
                            <div class="kp-stat-label">Host Disk</div>
                            <div class="kp-muted uk-text-small kp-mono" id="dash-host-disk-sub">&nbsp;</div>
                        </div>
                        <span class="kp-stat-icon" uk-icon="icon: database; ratio: 1.75"></span>
                    </div>
                </div>
            </div>
            <div>
                <div class="kp-stat-card">
                    <div class="uk-flex uk-flex-between">
                        <div>
                            <div class="kp-stat-value" id="dash-host-procs">\u2014</div>
                            <div class="kp-stat-label">Running Processes</div>
                            <div class="kp-muted uk-text-small kp-mono" id="dash-host-procs-sub">&nbsp;</div>
                        </div>
                        <span class="kp-stat-icon" uk-icon="icon: list; ratio: 1.75"></span>
                    </div>
                </div>
            </div>
        </div>
        `:""}

        <!-- global traffic -->
        <div class="kp-view-header uk-margin-top">
            <h2 class="kp-view-title" style="font-size:1.25rem">Traffic
                <span class="kp-muted uk-text-small" style="font-weight:400"> \u2014 last 24 hours</span>
            </h2>
        </div>
        <div class="kp-card uk-padding-small uk-margin-medium-bottom">
            <div class="uk-grid-small uk-child-width-1-2 uk-child-width-1-4@m uk-margin-small-bottom" uk-grid>
                <div><div class="kp-stat-card" style="padding:16px">
                    <div class="kp-stat-value" style="font-size:1.6rem;color:var(--kp-success)">
                        ${(s?.status_codes?.["2xx"]??0).toLocaleString()}
                    </div>
                    <div class="kp-stat-label" style="color:var(--kp-success)">2xx Success</div>
                </div></div>
                <div><div class="kp-stat-card" style="padding:16px">
                    <div class="kp-stat-value" style="font-size:1.6rem;color:var(--kp-cyan)">
                        ${(s?.status_codes?.["3xx"]??0).toLocaleString()}
                    </div>
                    <div class="kp-stat-label" style="color:var(--kp-cyan)">3xx Redirect</div>
                </div></div>
                <div><div class="kp-stat-card" style="padding:16px">
                    <div class="kp-stat-value" style="font-size:1.6rem;color:var(--kp-warning)">
                        ${(s?.status_codes?.["4xx"]??0).toLocaleString()}
                    </div>
                    <div class="kp-stat-label" style="color:var(--kp-warning)">4xx Client Err</div>
                </div></div>
                <div><div class="kp-stat-card" style="padding:16px">
                    <div class="kp-stat-value" style="font-size:1.6rem;color:var(--kp-danger)">
                        ${(s?.status_codes?.["5xx"]??0).toLocaleString()}
                    </div>
                    <div class="kp-stat-label" style="color:var(--kp-danger)">5xx Server Err</div>
                </div></div>
            </div>
            <div class="uk-margin-small-bottom" style="color:var(--kp-text-dim);font-size:0.85rem">
                Total Bandwidth:
                <span style="color:var(--kp-cyan);font-family:'JetBrains Mono',monospace">
                    ${E(s?.total_bandwidth??0)}
                </span>
            </div>
            <div style="position:relative;height:180px">
                <canvas id="dash-traffic-chart"></canvas>
            </div>
        </div>

        <!-- drilldown modal \u2014 populated on 4xx/5xx bar click -->
        <div id="stats-drilldown-modal" uk-modal>
            <div class="uk-modal-dialog uk-modal-body" style="min-width:min(96vw,900px)">
                <button class="uk-modal-close-default" type="button" uk-close></button>
                <h3 class="kp-view-title uk-margin-small-bottom" id="stats-drilldown-title">Request Detail</h3>
                <div id="stats-drilldown-body">
                    <div uk-spinner="ratio:0.8" style="color:var(--kp-blue)"></div>
                </div>
            </div>
        </div>

        <!-- global pod aggregate + top sites -->
        <div class="uk-grid-small uk-child-width-1-1 uk-child-width-1-2@m uk-margin-medium-bottom" uk-grid>
            <div>

                <!-- recent sites -->
                <div class="kp-view-header">
                    <h2 class="kp-view-title" style="font-size:1.25rem">Recent Sites</h2>
                </div>
                <div class="">
                    ${e.length===0?emptyState("world","No sites yet"):e.slice(-3).reverse().map(i=>Ht(i,e)).join("")}
                </div>

            </div>
            <div>

                <!-- top traffic sites -->
                <div class="kp-view-header">
                    <h2 class="kp-view-title" style="font-size:1.25rem">Top Sites by Traffic</h2>
                </div>
                <div class="kp-table-wrap">
                    <table class="uk-table uk-table-small uk-table-divider uk-margin-remove">
                        <thead><tr>
                            <th style="color:var(--kp-text-dim);font-size:0.75rem">Host</th>
                            <th style="color:var(--kp-text-dim);font-size:0.75rem;text-align:right">Hits</th>
                        </tr></thead>
                        <tbody>
                            ${(s?.top_sites??[]).length===0?'<tr><td colspan="2" class="kp-muted uk-text-small">No traffic data</td></tr>':(s?.top_sites??[]).map(i=>`
                                    <tr>
                                        <td class="kp-mono" style="font-size:0.8rem">${g(i.name)}</td>
                                        <td style="text-align:right;color:var(--kp-cyan);
                                            font-family:'JetBrains Mono',monospace;font-size:0.8rem">
                                            ${i.count.toLocaleString()}
                                        </td>
                                    </tr>`).join("")}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        `,r&&Re(),s?.hits_per_hour?.length){await kt();let i=document.getElementById("dash-traffic-chart");i&&window.Chart&&(N&&(N.destroy(),N=null),N=new window.Chart(i,{type:"bar",data:{labels:s.hits_per_hour.map(l=>new Date(l.hour).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})),datasets:[{label:"2xx",data:s.hits_per_hour.map(l=>l["2xx"]),backgroundColor:"rgba(39,174,96,0.75)",borderColor:"rgba(39,174,96,1)",borderWidth:1,borderRadius:3},{label:"3xx",data:s.hits_per_hour.map(l=>l["3xx"]),backgroundColor:"rgba(43,142,255,0.75)",borderColor:"rgba(43,142,255,1)",borderWidth:1,borderRadius:3},{label:"4xx",data:s.hits_per_hour.map(l=>l["4xx"]),backgroundColor:"rgba(255,171,0,0.75)",borderColor:"rgba(255,171,0,1)",borderWidth:1,borderRadius:3},{label:"5xx",data:s.hits_per_hour.map(l=>l["5xx"]),backgroundColor:"rgba(235,59,90,0.75)",borderColor:"rgba(235,59,90,1)",borderWidth:1,borderRadius:3}]},options:{responsive:!0,maintainAspectRatio:!1,onClick:(l,d)=>{if(!d||!d.length)return;let k=d[0].datasetIndex,b=N.data.datasets[k].label;if(b!=="4xx"&&b!=="5xx")return;let u=s.hits_per_hour[d[0].index]?.hour;u&&vt("/stats/drilldown",u,b,!0)},onHover:(l,d)=>{if(!d||!d.length){l.native.target.style.cursor="default";return}let k=N.data.datasets[d[0].datasetIndex].label;l.native.target.style.cursor=k==="4xx"||k==="5xx"?"pointer":"default"},plugins:{legend:{display:!0,labels:{color:"#6b8cae",font:{size:11}},onHover:l=>{l.native.target.style.cursor="pointer"},onLeave:l=>{l.native.target.style.cursor="default"}},tooltip:{mode:"index",backgroundColor:"#0c1530",borderColor:"#1a2a4a",borderWidth:1,titleColor:"#dde8f5",bodyColor:"#6b8cae"}},scales:{x:{stacked:!0,ticks:{color:"#6b8cae",font:{size:10},maxRotation:45},grid:{color:"rgba(26,42,74,0.6)"}},y:{stacked:!0,ticks:{color:"#6b8cae",font:{size:10}},grid:{color:"rgba(26,42,74,0.6)"},beginAtZero:!0}}}}))}document.getElementById("dash-new-site")?.addEventListener("click",()=>ot())}function K(t=null){let e=t?`/sites/${t}/security/ip`:"/security/ip",s=t?`/sites/${t}/security/ua`:"/security/ua",a=t?`/sites/${t}/waf`:"/settings/waf",o=t?`/sites/${t}/security/country`:"/security/country",n=t?`/sites/${t}/security/asn`:"/security/asn";return`
        <div id="security-panel" data-ip-base="${e}" data-ua-base="${s}" data-geo-base="${o}" data-asn-base="${n}" data-waf-base="${a}" ${t?`data-site-id="${t}"`:""}>

            <p class="kp-muted uk-text-small uk-margin-small-bottom">
                <span uk-icon="icon: warning; ratio: 0.75"></span>
                The Spamhaus DROP lists are enforced alongside these rules on every
                request. Whitelist an IP here to allow it through regardless.
                <a href="https://www.spamhaus.org/blocklists/do-not-route-or-peer/" target="_blank" rel="noopener">
                    About Spamhaus DROP
                </a>
            </p>

            <div class="kp-card uk-padding-small uk-margin-bottom">
                <div class="uk-flex uk-flex-between uk-flex-middle uk-margin-small-bottom">
                    <h3 class="kp-view-title">IP Rules</h3>
                    <div class="uk-flex" style="gap:8px">
                        <a class="uk-button kp-btn-ghost kp-btn-sm" href="/api${e}/export" download="${t?`site-${t}-ip-rules.csv`:"podnest-global-ip-rules.csv"}" uk-tooltip="Export IP rules as CSV">
                            <span uk-icon="download"></span>
                        </a>
                        <label class="uk-button kp-btn-ghost kp-btn-sm" style="cursor:pointer" uk-tooltip="Import IP rules from CSV">
                            <span uk-icon="upload"></span>
                            <input type="file" id="sec-ip-import" accept=".csv" style="display:none">
                        </label>
                        <button class="uk-button kp-btn-primary kp-btn-sm" id="sec-ip-save" uk-tooltip="Save the IP Rules">
                            <span uk-icon="check"></span>
                        </button>
                    </div>
                </div>
                <p class="kp-muted uk-text-small uk-margin-small-bottom">
                    One IP address or CIDR block per line (e.g. <span class="kp-mono">1.2.3.4</span>
                    or <span class="kp-mono">10.0.0.0/8</span>).
                    A whitelisted IP is allowed outright, ahead of both the global and
                    per-site blacklists. Whitelist is disabled when empty.
                </p>
                <div class="uk-grid-small" uk-grid>
                    <div class="uk-width-1-2@s">
                        <label class="kp-label">
                            <span uk-icon="icon: check; ratio: 0.75" style="color:var(--kp-success)"></span>
                            Whitelist
                        </label>
                        <textarea class="uk-textarea kp-textarea" id="sec-ip-whitelist" rows="6"
                            placeholder="# allow only these IPs&#10;1.2.3.4&#10;10.0.0.0/8"></textarea>
                    </div>
                    <div class="uk-width-1-2@s">
                        <label class="kp-label">
                            <span uk-icon="icon: ban; ratio: 0.75" style="color:var(--kp-danger)"></span>
                            Blacklist
                        </label>
                        <textarea class="uk-textarea kp-textarea" id="sec-ip-blacklist" rows="6"
                            placeholder="# block these IPs&#10;5.6.7.8&#10;192.168.99.0/24"></textarea>
                    </div>
                </div>
            </div>

            <div class="kp-card uk-padding-small uk-margin-bottom">
                <div class="uk-flex uk-flex-between uk-flex-middle uk-margin-small-bottom">
                    <h3 class="kp-view-title">User-Agent Rules</h3>
                    <div class="uk-flex" style="gap:8px">
                        <a class="uk-button kp-btn-ghost kp-btn-sm" href="/api${s}/export" download="${t?`site-${t}-ua-rules.csv`:"podnest-global-ua-rules.csv"}" uk-tooltip="Export UA rules as CSV">
                            <span uk-icon="download"></span>
                        </a>
                        <label class="uk-button kp-btn-ghost kp-btn-sm" style="cursor:pointer" uk-tooltip="Import UA rules from CSV">
                            <span uk-icon="upload"></span>
                            <input type="file" id="sec-ua-import" accept=".csv" style="display:none">
                        </label>
                        <button class="uk-button kp-btn-primary kp-btn-sm" id="sec-ua-save" uk-tooltip="Save the User-Agent Rules">
                            <span uk-icon="check"></span>
                        </button>
                    </div>
                </div>
                <p class="kp-muted uk-text-small uk-margin-small-bottom">
                    One substring per line \u2014 matched case-insensitively against the full User-Agent header.
                    Blacklist always wins. Whitelist is disabled when empty.
                </p>
                <div class="uk-grid-small" uk-grid>
                    <div class="uk-width-1-2@s">
                        <label class="kp-label">
                            <span uk-icon="icon: check; ratio: 0.75" style="color:var(--kp-success)"></span>
                            Whitelist
                        </label>
                        <textarea class="uk-textarea kp-textarea" id="sec-ua-whitelist" rows="6"
                            placeholder="# allow only these agents&#10;mozilla&#10;googlebot"></textarea>
                    </div>
                    <div class="uk-width-1-2@s">
                        <label class="kp-label">
                            <span uk-icon="icon: ban; ratio: 0.75" style="color:var(--kp-danger)"></span>
                            Blacklist
                        </label>
                        <textarea class="uk-textarea kp-textarea" id="sec-ua-blacklist" rows="6"
                            placeholder="# block these agents&#10;sqlmap&#10;nikto&#10;masscan"></textarea>
                    </div>
                </div>
            </div>

            <div class="kp-card uk-padding-small uk-margin-bottom">
                <div class="uk-flex uk-flex-between uk-flex-middle uk-margin-small-bottom">
                    <h3 class="kp-view-title">Country Rules</h3>
                    <div class="uk-flex" style="gap:8px">
                        <button class="uk-button kp-btn-primary kp-btn-sm" id="sec-geo-save" uk-tooltip="Save the Country Rules">
                            <span uk-icon="check"></span>
                        </button>
                    </div>
                </div>
                <p class="kp-muted uk-text-small uk-margin-small-bottom">
                    One ISO 3166-1 alpha-2 country code per line (e.g. <span class="kp-mono">US</span>
                    or <span class="kp-mono">DE</span>).
                    Blacklist always wins. Whitelist is disabled when empty.
                    Unresolvable IPs (private ranges, unknown) are always allowed.
                </p>
                <div class="uk-grid-small" uk-grid>
                    <div class="uk-width-1-2@s">
                        <label class="kp-label">
                            <span uk-icon="icon: check; ratio: 0.75" style="color:var(--kp-success)"></span>
                            Whitelist
                        </label>
                        <textarea class="uk-textarea kp-textarea" id="sec-geo-whitelist" rows="6"
                            placeholder="# allow only these countries&#10;US&#10;CA"></textarea>
                    </div>
                    <div class="uk-width-1-2@s">
                        <label class="kp-label">
                            <span uk-icon="icon: ban; ratio: 0.75" style="color:var(--kp-danger)"></span>
                            Blacklist
                        </label>
                        <textarea class="uk-textarea kp-textarea" id="sec-geo-blacklist" rows="6"
                            placeholder="# block these countries&#10;CN&#10;RU"></textarea>
                    </div>
                </div>
            </div>

            <div class="kp-card uk-padding-small uk-margin-bottom">
                <div class="uk-flex uk-flex-between uk-flex-middle uk-margin-small-bottom">
                    <h3 class="kp-view-title">ASN Rules</h3>
                    <div class="uk-flex uk-flex-middle" style="gap:8px">
                        <button class="uk-button kp-btn-ghost kp-btn-sm" id="sec-asn-lookup" uk-tooltip="Look up the ASN for an IP or domain">
                            <span uk-icon="eye"></span>
                        </button>
                        <div style="width:1px;align-self:stretch;background:var(--kp-border)"></div>
                        <button class="uk-button kp-btn-primary kp-btn-sm" id="sec-asn-save" uk-tooltip="Save the ASN Rules">
                            <span uk-icon="check"></span>
                        </button>
                    </div>
                </div>
                <p class="kp-muted uk-text-small uk-margin-small-bottom">
                    One autonomous system number per line (e.g. <span class="kp-mono">AS15169</span>
                    or <span class="kp-mono">15169</span>).
                    Blacklist always wins. Whitelist is disabled when empty.
                    Unresolvable IPs (private ranges, unknown) are always allowed.
                </p>
                <div class="uk-grid-small" uk-grid>
                    <div class="uk-width-1-2@s">
                        <label class="kp-label">
                            <span uk-icon="icon: check; ratio: 0.75" style="color:var(--kp-success)"></span>
                            Whitelist
                        </label>
                        <textarea class="uk-textarea kp-textarea" id="sec-asn-whitelist" rows="6"
                            placeholder="# allow only these networks&#10;AS7922&#10;AS20115"></textarea>
                    </div>
                    <div class="uk-width-1-2@s">
                        <label class="kp-label">
                            <span uk-icon="icon: ban; ratio: 0.75" style="color:var(--kp-danger)"></span>
                            Blacklist
                        </label>
                        <textarea class="uk-textarea kp-textarea" id="sec-asn-blacklist" rows="6"
                            placeholder="# block these networks&#10;AS16509&#10;AS14061"></textarea>
                    </div>
                </div>
            </div>

            ${t?"":`
            <div class="uk-grid uk-grid-small uk-margin-bottom" uk-grid>
                <div class="uk-width-1-2@m">
                    <div class="kp-card uk-padding-small uk-height-1-1">
                        <div class="uk-flex uk-flex-between uk-flex-middle uk-margin-small-bottom">
                            <h3 class="kp-view-title">Trusted Proxy Ranges</h3>
                            <div class="uk-flex" style="gap:8px">
                                <a class="uk-button kp-btn-ghost kp-btn-sm" href="/api/settings/trusted-proxies/export" download="podnest-trusted-proxies.csv" uk-tooltip="Export trusted proxies">
                                    <span uk-icon="download"></span>
                                </a>
                                <label class="uk-button kp-btn-ghost kp-btn-sm" style="cursor:pointer" uk-tooltip="Import trusted proxies from CSV">
                                    <span uk-icon="upload"></span>
                                    <input type="file" id="sec-tp-import" accept=".csv" style="display:none">
                                </label>
                                <button class="uk-button kp-btn-primary kp-btn-sm" id="sec-tp-save" uk-tooltip="Save Trusted Proxy Ranges">
                                    <span uk-icon="check"></span>
                                </button>
                            </div>
                        </div>
                        <p class="kp-muted uk-text-small uk-margin-small-bottom">
                            Custom IP ranges (one CIDR per line) to trust in addition to the
                            auto-fetched Cloudflare, Fastly, and CloudFront ranges.
                            <code>X-Forwarded-For</code> is only honoured when a request arrives
                            from one of these addresses.
                        </p>
                        <textarea class="uk-textarea kp-textarea kp-mono" id="sec-tp-cidrs" rows="12"
                            placeholder="192.168.1.0/24"></textarea>
                        <p class="kp-muted uk-text-small uk-margin-small-top">
                            One IPv4 or IPv6 CIDR per line. Auto-fetched provider ranges are
                            managed automatically and do not need to be entered here.
                        </p>
                    </div>
                </div>
                <div class="uk-width-1-2@m">
                    <div class="kp-card uk-padding-small uk-height-1-1">
                        <div class="uk-flex uk-flex-between uk-flex-middle uk-margin-small-bottom">
                            <h3 class="kp-view-title">Security Bypass</h3>
                            <div class="uk-flex" style="gap:8px">
                                <button class="uk-button kp-btn-primary kp-btn-sm" id="sec-bypass-save" uk-tooltip="Save Bypass Rules">
                                    <span uk-icon="check"></span>
                                </button>
                            </div>
                        </div>
                        <p class="kp-muted uk-text-small uk-margin-small-bottom">
                            IPs or CIDRs that skip all security checks (IP rules, UA rules, WAF).
                            Use for trusted services that must not be blocked. Supports inline
                            notes with <code>#</code> e.g. <code>1.2.3.4/32 # WP Umbrella</code>
                        </p>
                        <textarea class="uk-textarea kp-textarea kp-mono" id="sec-bypass-cidrs" rows="12"
                            placeholder="1.2.3.4/32 # WP Umbrella&#10;2001:db8::/32 # monitoring"></textarea>
                        <p class="kp-muted uk-text-small uk-margin-small-top">
                            One IPv4, IPv6, or CIDR per line. Bypassed IPs are still proxied normally \u2014 only enforcement is skipped.
                        </p>
                    </div>
                </div>
            </div>

            <div class="kp-card uk-padding-small">
                <div class="uk-flex uk-flex-between uk-flex-middle uk-margin-small-bottom">
                    <h3 class="kp-view-title">Web Application Firewall</h3>
                    <div class="uk-flex" style="gap:8px">
                        <a class="uk-button kp-btn-ghost kp-btn-sm" href="/api/settings/waf/export" download="podnest-waf-settings.json" uk-tooltip="Export WAF settings">
                            <span uk-icon="download"></span>
                        </a>
                        <label class="uk-button kp-btn-ghost kp-btn-sm" style="cursor:pointer" uk-tooltip="Import WAF settings from JSON">
                            <span uk-icon="upload"></span>
                            <input type="file" id="sec-waf-import" accept=".json" style="display:none">
                        </label>
                        <button class="uk-button kp-btn-primary kp-btn-sm" id="sec-waf-save" uk-tooltip="Save WAF Settings">
                            <span uk-icon="check"></span>
                        </button>
                    </div>
                </div>
                <p class="kp-muted uk-text-small uk-margin-small-bottom">
                    Inspects all proxied requests using the OWASP Core Rule Set.
                    Start in Detection mode to review false positives before enabling Prevention.
                    The engine recompiles in the background after saving.
                </p>
                <div class="uk-grid-small uk-margin-small-bottom" uk-grid>
                    <div class="uk-width-1-2@s">
                        <label class="kp-label" for="sec-waf-mode">Mode</label>
                        <select class="uk-select kp-select" id="sec-waf-mode">
                            <option value="0">Detection \u2014 log matches only</option>
                            <option value="1">Prevention \u2014 block matching requests</option>
                        </select>
                    </div>
                    <div class="uk-width-1-2@s">
                        <label class="kp-label" for="sec-waf-paranoia">Paranoia Level</label>
                        <select class="uk-select kp-select" id="sec-waf-paranoia">
                            <option value="1">1 \u2014 Baseline (recommended)</option>
                            <option value="2">2 \u2014 Moderate</option>
                            <option value="3">3 \u2014 Strict</option>
                            <option value="4">4 \u2014 Paranoid</option>
                        </select>
                    </div>
                </div>
                <div class="uk-grid-small uk-margin-small-bottom" uk-grid>
                    <div class="uk-width-1-2@s">
                        <label class="kp-label">
                            <input class="uk-checkbox" type="checkbox" id="sec-waf-enabled">
                            &nbsp;Enable WAF (OWASP Core Rule Set)
                        </label>
                    </div>
                    <div class="uk-width-1-2@s">
                        <label class="kp-label">
                            <input class="uk-checkbox" type="checkbox" id="sec-waf-audit">
                            &nbsp;Enable Audit Log
                        </label>
                    </div>
                </div>
                <div class="uk-margin-small-bottom">
                    <label class="kp-label" for="sec-waf-exclusions">Global Rule Exclusions</label>
                    <textarea class="uk-textarea kp-textarea kp-mono kp-waf-exclusions" id="sec-waf-exclusions" rows="15"
                        placeholder="# Numeric = rule ID, text = tag name, one per line&#10;920350&#10;attack-sqli"></textarea>
                    <p class="kp-muted uk-text-small uk-margin-small-top">
                        Numeric entries map to <span class="kp-mono">SecRuleRemoveById</span>;
                        text entries to <span class="kp-mono">SecRuleRemoveByTag</span>.
                    </p>
                </div>
            </div>
            `}

        </div>`}async function M(t){let e=t.querySelector("#security-panel");if(!e)return;let s=e.dataset.ipBase,a=e.dataset.uaBase,o=e.dataset.wafBase;try{let n=e.dataset.geoBase,r=e.dataset.asnBase,i=[m.get(s),m.get(a),m.get(n),m.get(r)];e.dataset.siteId||i.push(m.get(o),m.get("/settings/trusted-proxies"),m.get("/security/bypass"));let[l,d,k,b,u,p,v]=await Promise.all(i);if(!t.querySelector("#sec-ip-whitelist"))return;if(t.querySelector("#sec-ip-whitelist").value=l.whitelist??"",t.querySelector("#sec-ip-blacklist").value=l.blacklist??"",t.querySelector("#sec-ua-whitelist").value=d.whitelist??"",t.querySelector("#sec-ua-blacklist").value=d.blacklist??"",t.querySelector("#sec-geo-whitelist").value=k.whitelist??"",t.querySelector("#sec-geo-blacklist").value=k.blacklist??"",t.querySelector("#sec-asn-whitelist").value=b.whitelist??"",t.querySelector("#sec-asn-blacklist").value=b.blacklist??"",u){let h=t.querySelector("#sec-waf-enabled"),f=t.querySelector("#sec-waf-audit"),w=t.querySelector("#sec-waf-mode"),S=t.querySelector("#sec-waf-paranoia"),T=t.querySelector("#sec-waf-exclusions");h&&(h.checked=!!u.Enabled),f&&(f.checked=!!u.AuditLog),w&&(w.value=String(u.Mode??0)),S&&(S.value=String(u.ParanoiaLevel??1)),T&&(T.value=u.Exclusions??"")}if(p){let h=t.querySelector("#sec-tp-cidrs");h&&(h.value=p.trusted_proxies_custom??"")}if(v){let h=t.querySelector("#sec-bypass-cidrs");h&&(h.value=v.bypass??"")}}catch(n){c.error("Failed to load security rules: "+n.message)}}function lt(t){let e=t.querySelector("#security-panel");if(!e)return;let s=e.dataset.ipBase,a=e.dataset.uaBase,o=e.dataset.geoBase;t.querySelector("#sec-ip-save")?.addEventListener("click",async()=>{let n=t.querySelector("#sec-ip-save"),r=n.innerHTML;n.disabled=!0,n.innerHTML='<div uk-spinner="ratio: 0.5"></div>';try{await m.put(s,{whitelist:t.querySelector("#sec-ip-whitelist").value,blacklist:t.querySelector("#sec-ip-blacklist").value}),c.success("IP rules saved")}catch(i){c.error(i.message)}finally{n.disabled=!1,n.innerHTML=r}}),t.querySelector("#sec-ua-save")?.addEventListener("click",async()=>{let n=t.querySelector("#sec-ua-save"),r=n.innerHTML;n.disabled=!0,n.innerHTML='<div uk-spinner="ratio: 0.5"></div>';try{await m.put(a,{whitelist:t.querySelector("#sec-ua-whitelist").value,blacklist:t.querySelector("#sec-ua-blacklist").value}),c.success("UA rules saved")}catch(i){c.error(i.message)}finally{n.disabled=!1,n.innerHTML=r}}),t.querySelector("#sec-geo-save")?.addEventListener("click",async()=>{let n=t.querySelector("#sec-geo-save"),r=n.innerHTML;n.disabled=!0,n.innerHTML='<div uk-spinner="ratio: 0.5"></div>';try{let i={whitelist:t.querySelector("#sec-geo-whitelist").value,blacklist:t.querySelector("#sec-geo-blacklist").value},l=await m.put(o,i);l?.status==="confirm"&&(await UIkit.modal.confirm(`${l.reason}. Save anyway?`),l=await m.put(o,{...i,confirm:!0})),c.success("Country rules saved")}catch(i){i instanceof Error&&c.error(i.message)}finally{n.disabled=!1,n.innerHTML=r}}),t.querySelector("#sec-asn-save")?.addEventListener("click",async()=>{let n=t.querySelector("#sec-asn-save"),r=n.innerHTML;n.disabled=!0,n.innerHTML='<div uk-spinner="ratio: 0.5"></div>';try{let i=t.querySelector("#security-panel").dataset.asnBase,l={whitelist:t.querySelector("#sec-asn-whitelist").value,blacklist:t.querySelector("#sec-asn-blacklist").value},d=await m.put(i,l);d?.status==="confirm"&&(await UIkit.modal.confirm(`${d.reason}. Save anyway?`),d=await m.put(i,{...l,confirm:!0})),c.success("ASN rules saved")}catch(i){i instanceof Error&&c.error(i.message)}finally{n.disabled=!1,n.innerHTML=r}}),t.querySelector("#sec-asn-lookup")?.addEventListener("click",()=>De(t)),t.querySelector("#sec-tp-save")?.addEventListener("click",async()=>{let n=t.querySelector("#sec-tp-save"),r=n.innerHTML;n.disabled=!0,n.innerHTML='<div uk-spinner="ratio: 0.5"></div>';try{await m.put("/settings/trusted-proxies",{trusted_proxies_custom:t.querySelector("#sec-tp-cidrs").value.trim()}),c.success("Trusted proxy ranges saved")}catch(i){c.error(i.message)}finally{n.disabled=!1,n.innerHTML=r}}),t.querySelector("#sec-bypass-save")?.addEventListener("click",async()=>{let n=t.querySelector("#sec-bypass-save"),r=n.innerHTML;n.disabled=!0,n.innerHTML='<div uk-spinner="ratio: 0.5"></div>';try{await m.put("/security/bypass",{bypass:t.querySelector("#sec-bypass-cidrs").value.trim()}),c.success("Bypass rules saved")}catch(i){c.error(i.message)}finally{n.disabled=!1,n.innerHTML=r}}),t.querySelector("#sec-tp-import")?.addEventListener("change",async n=>{let r=n.target.files[0];if(!r)return;let i=new FormData;i.append("file",r);try{let l=await fetch("/api/settings/trusted-proxies/import",{method:"POST",headers:{"X-CSRF-Token":window.KP?.csrf??""},body:i}),d=l.status===204?null:await l.json().catch(()=>null);if(!l.ok)throw new Error(d?.error||`HTTP ${l.status}`);await M(t),c.success("Trusted proxies imported")}catch(l){c.error(l.message)}finally{n.target.value=""}}),t.querySelector("#sec-waf-save")?.addEventListener("click",async()=>{let n=t.querySelector("#sec-waf-save"),r=n.innerHTML;n.disabled=!0,n.innerHTML='<div uk-spinner="ratio: 0.5"></div>';try{await m.put(e.dataset.wafBase,{enabled:t.querySelector("#sec-waf-enabled").checked,mode:parseInt(t.querySelector("#sec-waf-mode").value,10),paranoia_level:parseInt(t.querySelector("#sec-waf-paranoia").value,10),audit_log:t.querySelector("#sec-waf-audit").checked,exclusions:t.querySelector("#sec-waf-exclusions").value.trim()}),c.success("WAF settings saved \u2014 engine recompiling in background")}catch(i){c.error(i.message)}finally{n.disabled=!1,n.innerHTML=r}}),t.querySelector("#sec-ip-import")?.addEventListener("change",async n=>{let r=n.target.files[0];if(!r)return;let i=new FormData;i.append("file",r);try{let l=await fetch("/api"+s+"/import",{method:"POST",headers:{"X-CSRF-Token":window.KP?.csrf??""},body:i}),d=l.status===204?null:await l.json().catch(()=>null);if(!l.ok)throw new Error(d?.error||`HTTP ${l.status}`);await M(t),c.success("IP rules imported")}catch(l){c.error(l.message)}finally{n.target.value=""}}),t.querySelector("#sec-ua-import")?.addEventListener("change",async n=>{let r=n.target.files[0];if(!r)return;let i=new FormData;i.append("file",r);try{let l=await fetch("/api"+a+"/import",{method:"POST",headers:{"X-CSRF-Token":window.KP?.csrf??""},body:i}),d=l.status===204?null:await l.json().catch(()=>null);if(!l.ok)throw new Error(d?.error||`HTTP ${l.status}`);await M(t),c.success("UA rules imported")}catch(l){c.error(l.message)}finally{n.target.value=""}}),t.querySelector("#sec-waf-import")?.addEventListener("change",async n=>{let r=n.target.files[0];if(!r)return;let i=new FormData;i.append("file",r);try{let l=await fetch("/api/settings/waf/import",{method:"POST",headers:{"X-CSRF-Token":window.KP?.csrf??""},body:i}),d=l.status===204?null:await l.json().catch(()=>null);if(!l.ok)throw new Error(d?.error||`HTTP ${l.status}`);await M(t),c.success("WAF settings imported")}catch(l){c.error(l.message)}finally{n.target.value=""}})}function De(t){document.getElementById("kp-asn-lookup-modal")?.remove(),document.body.insertAdjacentHTML("beforeend",`
        <div id="kp-asn-lookup-modal" uk-modal>
            <div class="uk-modal-dialog kp-modal uk-modal-body">
                <button class="uk-modal-close-default" type="button" uk-close></button>
                <h3 class="kp-view-title">ASN Lookup</h3>
                <div class="uk-flex uk-margin-top" style="gap:8px">
                    <input class="uk-input kp-input" id="asn-lookup-q" type="text" placeholder="IP address or domain">
                    <button class="uk-button kp-btn-primary kp-btn-sm" id="asn-lookup-go" uk-tooltip="Look it up">
                        <span uk-icon="search"></span>
                    </button>
                </div>
                <div id="asn-lookup-result" class="uk-margin-top"></div>
            </div>
        </div>`);let s=UIkit.modal("#kp-asn-lookup-modal");s.show();let a=async()=>{let o=document.getElementById("asn-lookup-q").value.trim();if(!o)return;let n=document.getElementById("asn-lookup-result");n.innerHTML='<div uk-spinner="ratio: 0.5"></div>';try{let r=await m.get(`/security/asn/lookup?q=${encodeURIComponent(o)}`);if(!r?.asn){n.innerHTML='<p class="kp-muted uk-text-small">No ASN found for <span class="kp-mono"></span>.</p>',n.querySelector(".kp-mono").textContent=r?.ip||o;return}n.innerHTML=`
                <p class="uk-text-small">
                    <span class="kp-mono" id="asn-lookup-ip"></span> \u2192
                    <span class="kp-mono">AS${r.asn}</span>
                    <span id="asn-lookup-org"></span>
                    ${r.country?`<span class="kp-muted">(${r.country})</span>`:""}
                </p>
                <button class="uk-button kp-btn-ghost kp-btn-sm" id="asn-lookup-add">
                    <span uk-icon="ban"></span> Add AS${r.asn} to blacklist
                </button>`,n.querySelector("#asn-lookup-ip").textContent=r.ip,n.querySelector("#asn-lookup-org").textContent=r.org||"",n.querySelector("#asn-lookup-add").addEventListener("click",()=>{let i=t.querySelector("#sec-asn-blacklist"),l=`AS${r.asn}`;i.value.split(`
`).some(d=>d.trim().toUpperCase()===l)||(i.value=i.value.trim()?`${i.value.replace(/\s+$/,"")}
${l}`:l),s.hide(),c.success(`${l} added to blacklist \u2014 save to apply`)})}catch(r){n.innerHTML="",c.error(r.message)}};document.getElementById("asn-lookup-go").addEventListener("click",a),document.getElementById("asn-lookup-q").addEventListener("keydown",o=>{o.key==="Enter"&&a()})}async function Dt(t){if(!q()){t.innerHTML=P("Access denied");return}t.innerHTML=`
        <div class="kp-view-header">
            <h1 class="kp-view-title kp-cursor" style="font-size:2rem;">Global Security</h1>
        </div>
        <p class="kp-muted uk-text-small uk-margin-bottom">
            Global rules apply to all sites before per-site rules are evaluated.
            Blacklist always wins \u2014 except for IP rules, where a whitelist match
            in either scope allows the request outright.
        </p>
        ${K(null)}`,lt(t),M(t)}function Fe(t){switch(t){case"valid":return'<span class="kp-ssl-valid" uk-icon="icon: lock; ratio: 0.85" uk-tooltip="Valid SSL certificate"></span>';case"self-signed":return'<span class="kp-ssl-self-signed" uk-icon="icon: lock; ratio: 0.85" uk-tooltip="Self-signed certificate"></span>';case"expired":return'<span class="kp-ssl-none" uk-icon="icon: warning; ratio: 0.85" uk-tooltip="Expired certificate"></span>';case"mismatch":return'<span class="kp-ssl-none" uk-icon="icon: warning; ratio: 0.85" uk-tooltip="Certificate does not match this domain"></span>';default:return'<span class="kp-ssl-none" uk-icon="icon: warning; ratio: 0.85" uk-tooltip="No SSL certificate"></span>'}}async function Ft(t){let e=document.getElementById("admin-domain-ssl");if(!(!e||!t))try{let s=await m.get(`/ssl-status?domain=${encodeURIComponent(t)}`);e.outerHTML=Fe(s.status)}catch{}}async function Ut(t){if(!q()){t.innerHTML=P("Access denied");return}let[e,s,a,o,n,r]=await Promise.all([m.get("/settings"),m.get("/settings/backup"),m.get("/settings/waf"),m.get("/settings/trusted-proxies"),m.get("/settings/notifications"),m.get("/settings/resources")]);t.innerHTML=`
    <div class="kp-view-header">
        <h1 class="kp-view-title kp-cursor" style="font-size:2rem;">Settings</h1>
    </div>
    <div class="uk-grid uk-grid-medium uk-margin-large-bottom" uk-grid>
        <div class="uk-width-1-1">
            <!-- panel configuration -->
            <div class="kp-card uk-padding">
                <h3 class="kp-view-title uk-margin-bottom">Panel Configuration</h3>
                <form id="settings-form" class="uk-form-stacked">
                    <div class="uk-margin">
                        <label class="kp-label" for="admin-domain">Management UI Domain</label>
                        <div class="uk-flex kp-settings-domain-wrap">
                            <span id="admin-domain-ssl" class="kp-ssl-pending" uk-icon="icon: more; ratio: 0.85"></span>
                            <input
                                class="uk-input kp-input"
                                id="admin-domain"
                                name="admin_domain"
                                type="text"
                                placeholder="panel.example.com"
                                value="${e.admin_domain??""}">
                        </div>
                        <p class="kp-muted uk-text-small uk-margin-small-top">
                            When set, the proxy will route this domain to the management UI and issue
                            a Let's Encrypt certificate automatically. Leave blank to disable.
                        </p>
                    </div>
                    <h3 class="kp-view-title uk-margin-bottom">Host Resource Wartcher</h3>
                    <div class="uk-grid-small uk-child-width-1-2@m" uk-grid>
                        <div>
                            <label class="kp-label" for="resource-ram-reserve">RAM Reserve (GB)</label>
                            <input class="uk-input kp-input" id="resource-ram-reserve" name="resource_ram_reserve_gb" type="number"
                                min="0.5" max="64" step="0.5" placeholder="2"
                                value="${r.resource_ram_reserve_gb??"2"}">
                            <p class="kp-muted uk-text-small uk-margin-small-top">
                                Amount of RAM to keep free for the host OS. Throttling fires when aggregate pod usage exceeds total RAM minus this value.
                            </p>
                        </div>
                        <div>
                            <label class="kp-label" for="resource-poll-interval">Poll Interval (seconds)</label>
                            <input class="uk-input kp-input" id="resource-poll-interval" name="resource_poll_interval" type="number"
                                min="5" max="300" step="5" placeholder="30"
                                value="${r.resource_poll_interval??"30"}">
                        </div>
                        <div>
                            <label class="kp-label" for="resource-throttle-pct">Throttle Aggressiveness (%)</label>
                            <input class="uk-input kp-input" id="resource-throttle-pct" name="resource_throttle_pct" type="number"
                                min="10" max="90" step="5" placeholder="50"
                                value="${r.resource_throttle_pct??"50"}">
                            <p class="kp-muted uk-text-small uk-margin-small-top">
                                Percentage to reduce the offending pod's current memory usage by when throttling.
                            </p>
                        </div>
                        <div>
                            <label class="kp-label" for="shutdown-job-timeout">Shutdown Job Drain (minutes)</label>
                            <input class="uk-input kp-input" id="shutdown-job-timeout" name="shutdown_job_timeout" type="number"
                                min="1" max="60" step="1" placeholder="5"
                                value="${r.shutdown_job_timeout??"5"}">
                            <p class="kp-muted uk-text-small uk-margin-small-top">
                                How long to wait for in-flight backups, restores, and imports to finish before the process exits on stop or restart.
                            </p>
                        </div>
                        <div class="uk-width-1-1">
                            <label class="kp-label" for="resource-webhook-url">Webhook URL <span class="kp-muted">(optional)</span></label>
                            <input class="uk-input kp-input kp-mono" id="resource-webhook-url" name="resource_webhook_url" type="url"
                                placeholder="https://hooks.example.com/notify"
                                value="${r.resource_webhook_url??""}">
                            <p class="kp-muted uk-text-small uk-margin-small-top">
                                HTTP POST with JSON payload on threshold breach and resolution. Compatible with Uptime Kuma, PagerDuty, Slack, etc.
                            </p>
                        </div>
                    </div>
                    <div class="uk-flex uk-flex-right uk-margin-top">
                        <button type="submit" class="uk-button kp-btn-primary">
                            <span uk-icon="check"></span> Save Settings
                        </button>
                    </div>
                </form>
            </div>
        </div>
        <div class="uk-width-1-2@m">
            <!-- backup schedule / retention -->
            <div class="kp-card uk-padding kp-settings-wrap uk-margin-top">
                <h3 class="kp-view-title uk-margin-bottom">Backup Schedule</h3>
                <form id="backup-form" class="uk-form-stacked">
                    <div class="uk-margin">
                        <label class="kp-label" for="backup-schedule">Cron Schedule</label>
                        <input
                            class="uk-input kp-input kp-mono"
                            id="backup-schedule"
                            name="backup_schedule"
                            type="text"
                            placeholder="0 2 * * *"
                            value="${s.backup_schedule??""}">
                        <p class="kp-muted uk-text-small uk-margin-small-top">
                            Standard 5-field cron expression. Leave blank to disable automatic backups.<br>
                            Examples: <span class="kp-mono">0 2 * * *</span> (daily at 2am) &nbsp;
                            <span class="kp-mono">0 */6 * * *</span> (every 6 hours)
                        </p>
                    </div>
                    <div class="uk-margin">
                        <label class="kp-label" for="backup-retain-days">Retain Backups (days)</label>
                        <input
                            class="uk-input kp-input"
                            id="backup-retain-days"
                            name="backup_retain_days"
                            type="number"
                            min="1"
                            max="365"
                            placeholder="30"
                            value="${s.backup_retain_days??"30"}">
                        <p class="kp-muted uk-text-small uk-margin-small-top">
                            Snapshots older than this many days will be pruned automatically after each backup run.
                        </p>
                    </div>
                    <div class="uk-flex uk-flex-right uk-margin-top">
                        <button type="submit" class="uk-button kp-btn-primary">
                            <span uk-icon="check"></span> Save
                        </button>
                    </div>
                </form>
            </div>
        </div>
        <div class="uk-width-1-2@m">
            <!-- S3 backup storage -->
            <div class="kp-card uk-padding kp-settings-wrap uk-margin-top">
                <h3 class="kp-view-title uk-margin-bottom">S3 Backup Storage</h3>
                <form id="s3-form" class="uk-form-stacked">
                    <div class="uk-margin">
                        <label class="kp-label" for="s3-endpoint">Endpoint URL</label>
                        <input
                            class="uk-input kp-input kp-mono"
                            id="s3-endpoint"
                            name="s3_endpoint"
                            type="url"
                            placeholder="https://s3.amazonaws.com"
                            value="${s.s3_endpoint??""}">
                        <p class="kp-muted uk-text-small uk-margin-small-top">
                            AWS S3 or any S3-compatible endpoint (Backblaze B2, MinIO, Wasabi, etc.)
                        </p>
                    </div>
                    <div class="uk-margin">
                        <label class="kp-label" for="s3-bucket">Bucket</label>
                        <input
                            class="uk-input kp-input kp-mono"
                            id="s3-bucket"
                            name="s3_bucket"
                            type="text"
                            placeholder="my-podnest-backups"
                            value="${s.s3_bucket??""}">
                    </div>
                    <div class="uk-margin">
                        <label class="kp-label" for="s3-region">Region</label>
                        <input
                            class="uk-input kp-input kp-mono"
                            id="s3-region"
                            name="s3_region"
                            type="text"
                            placeholder="us-east-1"
                            value="${s.s3_region??""}">
                    </div>
                    <div class="uk-margin">
                        <label class="kp-label" for="s3-access-key">Access Key ID</label>
                        <input
                            class="uk-input kp-input kp-mono"
                            id="s3-access-key"
                            name="s3_access_key"
                            type="text"
                            placeholder="AKIAIOSFODNN7EXAMPLE"
                            value="${s.s3_access_key??""}">
                    </div>
                    <div class="uk-margin">
                        <label class="kp-label" for="s3-secret-key">Secret Access Key</label>
                        <input
                            class="uk-input kp-input kp-mono"
                            id="s3-secret-key"
                            name="s3_secret_key"
                            type="password"
                            placeholder="${s.s3_secret_key?"saved \u2014 enter new value to change":"enter secret key"}"
                            value="">
                        <p class="kp-muted uk-text-small uk-margin-small-top">
                            Leave blank to keep the existing key.
                        </p>
                    </div>
                    <div class="uk-flex uk-flex-right uk-margin-top">
                        <button type="submit" class="uk-button kp-btn-primary">
                            <span uk-icon="check"></span> Save
                        </button>
                    </div>
                    <div class="uk-flex uk-flex-right uk-margin-small-top" style="gap:8px">
                        <a class="uk-button kp-btn-ghost kp-btn-sm" href="/api/settings/export" download="podnest-settings.csv" uk-tooltip="Export all settings">
                            <span uk-icon="download"></span>
                        </a>
                        <label class="uk-button kp-btn-ghost kp-btn-sm" style="cursor:pointer" uk-tooltip="Import settings from CSV">
                            <span uk-icon="upload"></span>
                            <input type="file" id="settings-import" accept=".csv" style="display:none">
                        </label>
                    </div>
                </form>
            </div>
        </div>
        <div class="uk-width-1-2@m">
            <!-- smtp / email notifications -->
            <div class="kp-card uk-padding kp-settings-wrap uk-margin-top">
                <h3 class="kp-view-title uk-margin-bottom">Email Notifications (SMTP)</h3>
                <form id="smtp-form" class="uk-form-stacked">
                    <div class="uk-margin">
                        <label class="kp-label" for="smtp-host">SMTP Host</label>
                        <input class="uk-input kp-input kp-mono" id="smtp-host" name="smtp_host" type="text"
                            placeholder="smtp.example.com" value="${n.smtp_host??""}">
                    </div>
                    <div class="uk-margin">
                        <label class="kp-label" for="smtp-port">Port</label>
                        <input class="uk-input kp-input kp-mono" id="smtp-port" name="smtp_port" type="text"
                            placeholder="587" value="${n.smtp_port??""}">
                    </div>
                    <div class="uk-margin">
                        <label class="kp-label" for="smtp-username">Username</label>
                        <input class="uk-input kp-input kp-mono" id="smtp-username" name="smtp_username" type="text"
                            placeholder="user@example.com" value="${n.smtp_username??""}">
                    </div>
                    <div class="uk-margin">
                        <label class="kp-label" for="smtp-password">Password</label>
                        <input class="uk-input kp-input kp-mono" id="smtp-password" name="smtp_password" type="password"
                            placeholder="${n.smtp_password?"saved \u2014 enter new value to change":"enter password"}"
                            value="">
                        <p class="kp-muted uk-text-small uk-margin-small-top">Leave blank to keep the existing password.</p>
                    </div>
                    <div class="uk-margin">
                        <label class="kp-label" for="smtp-from">From Address</label>
                        <input class="uk-input kp-input kp-mono" id="smtp-from" name="smtp_from" type="email"
                            placeholder="podnest@example.com" value="${n.smtp_from??""}">
                    </div>
                    <div class="uk-margin">
                        <label class="kp-label">
                            <input class="uk-checkbox" type="checkbox" id="smtp-tls" name="smtp_tls"
                                ${n.smtp_tls==="true"||n.smtp_tls==="1"?"checked":""}>
                            &nbsp;Use implicit TLS (port 465)
                        </label>
                        <p class="kp-muted uk-text-small uk-margin-small-top">
                            Unchecked uses STARTTLS (port 587). Check only for port 465 / SSL-only servers.
                        </p>
                    </div>
                    <div class="uk-flex uk-flex-right uk-margin-top">
                        <button type="submit" class="uk-button kp-btn-primary">
                            <span uk-icon="check"></span> Save
                        </button>
                    </div>
                </form>
            </div>
        </div>
        <div class="uk-width-1-2@m">
            <!-- aws sns / sms notifications -->
            <div class="kp-card uk-padding kp-settings-wrap uk-margin-top">
                <h3 class="kp-view-title uk-margin-bottom">SMS Notifications (AWS SNS)</h3>
                <form id="sns-form" class="uk-form-stacked">
                    <div class="uk-margin">
                        <label class="kp-label" for="aws-access-key">Access Key ID</label>
                        <input class="uk-input kp-input kp-mono" id="aws-access-key" name="aws_access_key" type="text"
                            placeholder="AKIAIOSFODNN7EXAMPLE" value="${n.aws_access_key??""}">
                    </div>
                    <div class="uk-margin">
                        <label class="kp-label" for="aws-secret-key">Secret Access Key</label>
                        <input class="uk-input kp-input kp-mono" id="aws-secret-key" name="aws_secret_key" type="password"
                            placeholder="${n.aws_secret_key?"saved \u2014 enter new value to change":"enter secret key"}"
                            value="">
                        <p class="kp-muted uk-text-small uk-margin-small-top">Leave blank to keep the existing key.</p>
                    </div>
                    <div class="uk-margin">
                        <label class="kp-label" for="aws-region">AWS Region</label>
                        <input class="uk-input kp-input kp-mono" id="aws-region" name="aws_region" type="text"
                            placeholder="us-east-1" value="${n.aws_region??""}">
                    </div>
                    <div class="uk-margin">
                        <label class="kp-label" for="aws-sns-sender-id">Sender ID <span class="kp-muted">(optional)</span></label>
                        <input class="uk-input kp-input kp-mono" id="aws-sns-sender-id" name="aws_sns_sender_id" type="text"
                            placeholder="PodNest" value="${n.aws_sns_sender_id??""}">
                        <p class="kp-muted uk-text-small uk-margin-small-top">
                            Alphanumeric sender name shown on the recipient's phone. Supported in select AWS regions only.
                        </p>
                    </div>
                    <div class="uk-flex uk-flex-right uk-margin-top">
                        <button type="submit" class="uk-button kp-btn-primary">
                            <span uk-icon="check"></span> Save
                        </button>
                    </div>
                </form>
            </div>
        </div>
        
        <div class="uk-width-1-1">
            <!-- leaving this here for future settings sections -->
        </div>
    </div>
    `,e.admin_domain&&Ft(e.admin_domain),document.getElementById("settings-form").addEventListener("submit",async i=>{i.preventDefault();let l=i.target.querySelector('[type="submit"]'),d=l.innerHTML;l.disabled=!0,l.innerHTML='<div uk-spinner="ratio: 0.6"></div> Saving...';let k=new FormData(i.target),b={admin_domain:k.get("admin_domain").trim()},u={resource_ram_reserve_gb:k.get("resource_ram_reserve_gb").trim(),resource_poll_interval:k.get("resource_poll_interval").trim(),resource_throttle_pct:k.get("resource_throttle_pct").trim(),resource_webhook_url:k.get("resource_webhook_url").trim(),shutdown_job_timeout:k.get("shutdown_job_timeout").trim()};try{await m.put("/settings",b),await m.put("/settings/resources",u),c.success("Settings saved"),Ft(b.admin_domain)}catch(p){c.error(p.message)}finally{l.disabled=!1,l.innerHTML=d}}),document.getElementById("settings-import").addEventListener("change",async i=>{let l=i.target.files[0];if(!l)return;let d=new FormData;d.append("file",l);try{let k=await fetch("/api/settings/import",{method:"POST",headers:{"X-CSRF-Token":window.KP?.csrf??""},body:d}),b=k.status===204?null:await k.json().catch(()=>null);if(!k.ok)throw new Error(b?.error||`HTTP ${k.status}`);c.success("Settings imported")}catch(k){c.error(k.message)}finally{i.target.value=""}}),document.getElementById("backup-form").addEventListener("submit",async i=>{i.preventDefault();let l=i.target.querySelector('[type="submit"]'),d=l.innerHTML;l.disabled=!0,l.innerHTML='<div uk-spinner="ratio: 0.6"></div> Saving...';let k=new FormData(i.target),b={backup_schedule:k.get("backup_schedule").trim(),backup_retain_days:k.get("backup_retain_days").trim()};try{await m.put("/settings/backup",b),c.success("Backup settings saved")}catch(u){c.error(u.message)}finally{l.disabled=!1,l.innerHTML=d}}),document.getElementById("s3-form").addEventListener("submit",async i=>{i.preventDefault();let l=i.target.querySelector('[type="submit"]'),d=l.innerHTML;l.disabled=!0,l.innerHTML='<div uk-spinner="ratio: 0.6"></div> Saving...';let k=new FormData(i.target),b={s3_endpoint:k.get("s3_endpoint").trim(),s3_bucket:k.get("s3_bucket").trim(),s3_region:k.get("s3_region").trim(),s3_access_key:k.get("s3_access_key").trim()},u=k.get("s3_secret_key").trim();u&&(b.s3_secret_key=u);try{await m.put("/settings/backup",b),c.success("S3 settings saved")}catch(p){c.error(p.message)}finally{l.disabled=!1,l.innerHTML=d}}),document.getElementById("smtp-form").addEventListener("submit",async i=>{i.preventDefault();let l=i.target.querySelector('[type="submit"]'),d=l.innerHTML;l.disabled=!0,l.innerHTML='<div uk-spinner="ratio: 0.6"></div> Saving...';let k=new FormData(i.target),b={smtp_host:k.get("smtp_host").trim(),smtp_port:k.get("smtp_port").trim(),smtp_username:k.get("smtp_username").trim(),smtp_from:k.get("smtp_from").trim(),smtp_tls:k.get("smtp_tls")?"true":"false"},u=k.get("smtp_password").trim();u&&(b.smtp_password=u);try{await m.put("/settings/notifications",b),c.success("Email notification settings saved")}catch(p){c.error(p.message)}finally{l.disabled=!1,l.innerHTML=d}}),document.getElementById("sns-form").addEventListener("submit",async i=>{i.preventDefault();let l=i.target.querySelector('[type="submit"]'),d=l.innerHTML;l.disabled=!0,l.innerHTML='<div uk-spinner="ratio: 0.6"></div> Saving...';let k=new FormData(i.target),b={aws_access_key:k.get("aws_access_key").trim(),aws_region:k.get("aws_region").trim(),aws_sns_sender_id:k.get("aws_sns_sender_id").trim()},u=k.get("aws_secret_key").trim();u&&(b.aws_secret_key=u);try{await m.put("/settings/notifications",b),c.success("SMS notification settings saved")}catch(p){c.error(p.message)}finally{l.disabled=!1,l.innerHTML=d}})}async function Nt(t){let e=`
        <div id="kp-edit-site-modal" uk-modal>
            <div class="uk-modal-dialog kp-modal uk-modal-body uk-width-large">
                <button class="uk-modal-close-default" type="button" uk-close></button>
                <h3 class="kp-view-title">Edit Site \u2014 ${t.Name}</h3>
                <form id="edit-site-form" class="uk-form-stacked uk-margin-top">
                    <div class="uk-grid-small" uk-grid>
                        <div class="uk-width-1-2@s">
                            <label class="kp-label">Site Name</label>
                            <input class="uk-input kp-input" name="name" type="text" value="${t.Name}" readonly disabled>
                        </div>
                        <div class="uk-width-1-2@s">
                            <label class="kp-label">Site Type</label>
                            <select class="uk-select kp-select" name="site_type" id="es-site-type">
                                <option value="1" ${t.SiteType===1?"selected":""}>PHP</option>
                                <option value="3" ${t.SiteType===3?"selected":""}>Static HTML</option>
                                <option value="4" ${t.SiteType===4?"selected":""}>Node.js</option>
                                <option value="5" ${t.SiteType===5?"selected":""}>.NET</option>
                                <option value="7" ${t.SiteType===7?"selected":""}>Python</option>
                                <option value="6" ${t.SiteType===6?"selected":""}>Reverse Proxy</option>
                            </select>
                        </div>
                        <div class="uk-width-1-2@s" id="es-php-version-wrap">
                            <label class="kp-label">PHP Version</label>
                            <select class="uk-select kp-select" name="php_version">
                                <option value="3" ${t.PHPVersion===3?"selected":""}>PHP 8.2</option>
                                <option value="4" ${t.PHPVersion===4?"selected":""}>PHP 8.3</option>
                                <option value="5" ${t.PHPVersion===5?"selected":""}>PHP 8.4</option>
                                <option value="6" ${t.PHPVersion===6?"selected":""}>PHP 8.5</option>
                            </select>
                        </div>
                        <div class="uk-width-1-2@s uk-hidden" id="es-node-version-wrap">
                            <label class="kp-label">Node.js Version</label>
                            <select class="uk-select kp-select" name="node_version">
                                <option value="2" ${t.RuntimeVersion===2?"selected":""}>Node 22 (LTS)</option>
                                <option value="4" ${t.RuntimeVersion===4?"selected":""}>Node 24</option>
                                <option value="5" ${t.RuntimeVersion===5?"selected":""}>Node 25</option>
                                <option value="6" ${t.RuntimeVersion===6?"selected":""}>Node 26</option>                                
                            </select>
                        </div>
                        <div class="uk-width-1-2@s uk-hidden" id="es-dotnet-version-wrap">
                            <label class="kp-label">.NET Version</label>
                            <select class="uk-select kp-select" name="dotnet_version">
                                <option value="1" ${t.RuntimeVersion===1?"selected":""}>.NET 8.0 (LTS)</option>
                                <option value="2" ${t.RuntimeVersion===2?"selected":""}>.NET 9.0</option>
                                <option value="3" ${t.RuntimeVersion===3?"selected":""}>.NET 10.0 (LTS)</option>
                            </select>
                        </div>
                        <div class="uk-width-1-2@s uk-hidden" id="es-python-version-wrap">
                            <label class="kp-label">Python Version</label>
                            <select class="uk-select kp-select" name="python_version">
                                <option value="1" ${t.SiteType===7&&t.RuntimeVersion===1?"selected":""}>Python 3.11</option>
                                <option value="2" ${t.SiteType===7&&t.RuntimeVersion===2?"selected":""}>Python 3.12</option>
                                <option value="3" ${t.SiteType===7&&t.RuntimeVersion===3?"selected":""}>Python 3.13</option>
                                <option value="4" ${t.SiteType!==7||t.RuntimeVersion===4?"selected":""}>Python 3.14</option>
                            </select>
                        </div>
                        <div class="uk-width-1-1 uk-hidden" id="es-start-command-wrap">
                            <label class="kp-label">Start Command</label>
                            <input class="uk-input kp-input" name="start_command" type="text" value="${t.StartCommand||""}">
                        </div>
                        <div class="uk-width-1-1 ${t.SiteType!==1?"uk-hidden":""}" id="es-wordpress-wrap">
                            <label><input class="uk-checkbox" type="checkbox" name="install_wordpress" checked> WordPress</label>
                        </div>
                    </div>
                    <div class="uk-flex uk-flex-right uk-margin-top" style="gap:8px">
                        <button type="button" class="uk-button kp-btn-ghost uk-modal-close">Cancel</button>
                        <button type="submit" class="uk-button kp-btn-primary">Save Changes</button>
                    </div>
                </form>
            </div>
        </div>`;document.body.insertAdjacentHTML("beforeend",e);let s=UIkit.modal("#kp-edit-site-modal"),a=document.getElementById("es-site-type"),o=document.getElementById("es-php-version-wrap"),n=document.getElementById("es-node-version-wrap"),r=document.getElementById("es-dotnet-version-wrap"),i=document.getElementById("es-python-version-wrap"),l=document.getElementById("es-start-command-wrap"),d=document.getElementById("es-wordpress-wrap");s.show();let k=b=>{o.classList.toggle("uk-hidden",b!==1&&b!==2||b===6),n.classList.toggle("uk-hidden",b!==4),r.classList.toggle("uk-hidden",b!==5),i.classList.toggle("uk-hidden",b!==7),l.classList.toggle("uk-hidden",b!==4&&b!==5&&b!==7),l.querySelector("input").required=b===7,d.classList.toggle("uk-hidden",b!==1)};k(t.SiteType),a.addEventListener("change",()=>k(parseInt(a.value))),document.getElementById("edit-site-form").addEventListener("submit",async b=>{b.preventDefault();let u=b.target.querySelector('[type="submit"]'),p=u.innerHTML;u.disabled=!0,u.innerHTML='<div uk-spinner="ratio: 0.6"></div> Saving...';let v=new FormData(b.target),h=parseInt(v.get("site_type")),f=null;h===4&&(f=parseInt(v.get("node_version"))),h===5&&(f=parseInt(v.get("dotnet_version"))),h===7&&(f=parseInt(v.get("python_version")));let w={php_version:parseInt(v.get("php_version"))||3,site_type:h,runtime_version:f,start_command:v.get("start_command")?.trim()||""},S=h===1?v.get("install_wordpress")==="on":!1;try{if(await m.put(`/sites/${t.ID}`,w),s.hide(),document.getElementById("kp-edit-site-modal")?.remove(),h!==6){$("Applying Changes","Saving changes and recreating pod...");try{await m.post(`/sites/${t.ID}/recreate`,{install_wordpress:S}),x(),c.success("Site updated and pod recreated")}catch(T){x(),c.error("Site saved but pod recreate failed: "+T.message)}}else c.success("Site updated");y.go("site-detail",{id:String(t.ID)})}catch(T){c.error(T.message),u.disabled=!1,u.innerHTML=p}}),document.getElementById("kp-edit-site-modal").addEventListener("hidden",()=>document.getElementById("kp-edit-site-modal")?.remove())}function jt(t){return`
        <div id="backups-panel" data-site-id="${t}">

            <!-- repo config card -->
            <div class="kp-card uk-padding-small uk-margin-bottom">
                <div class="uk-flex uk-flex-between uk-flex-middle uk-margin-small-bottom">
                    <h3 class="kp-view-title">Backup Destinations</h3>
                    <button class="uk-button kp-btn-primary kp-btn-sm" id="backup-repo-save" uk-tooltip="Save Your Backup Configuration">
                        <span uk-icon="check"></span>
                    </button>
                </div>
                <div class="uk-flex" style="gap:24px;flex-wrap:wrap" id="backup-repo-toggles">
                    <label class="uk-flex uk-flex-middle" style="gap:8px;cursor:pointer">
                        <input type="checkbox" class="uk-checkbox" id="backup-local-enabled">
                        <span class="kp-text">Local</span>
                    </label>
                    <label class="uk-flex uk-flex-middle" style="gap:8px;cursor:pointer">
                        <input type="checkbox" class="uk-checkbox" id="backup-s3-enabled">
                        <span class="kp-text">S3</span>
                    </label>
                </div>
                <p class="kp-muted uk-text-small uk-margin-small-top">
                    Local backups are stored under the site's SFTP home directory and are accessible
                    over SFTP as <span class="kp-mono">backups/local/</span>. S3 requires global S3
                    credentials to be configured under Settings.
                </p>
            </div>

            <!-- backup list card -->
            <div class="kp-card uk-padding-small">
                <div class="uk-flex uk-flex-between uk-flex-middle uk-margin-small-bottom">
                    <h3 class="kp-view-title">Snapshots</h3>
                    <div class="uk-flex" style="gap:6px">
                        <button class="uk-button kp-btn-primary kp-btn-sm" id="backup-run-btn" uk-tooltip="Run a Manual Backup">
                            <span uk-icon="cloud-upload"></span>
                        </button>
                        <button class="uk-button kp-btn-secondary kp-btn-sm" id="backup-import-btn"
                            uk-toggle="target: #import-backup-modal" uk-tooltip="Import a backup archive">
                            <span uk-icon="upload"></span>
                        </button>
                    </div>
                </div>
                <div id="backup-error-banner"></div>
                <div id="backup-list-wrap">
                    <div uk-spinner="ratio: 0.8" style="color:var(--kp-blue)"></div>
                </div>
            </div>

            <!-- import modal -->
            <div id="import-backup-modal" uk-modal>
                <div class="uk-modal-dialog uk-modal-body">
                    <button class="uk-modal-close-default" type="button" uk-close></button>
                    <h3 class="kp-view-title uk-margin-small-bottom">Import Backup Archive</h3>

                    <!-- target site selector -->
                    <div class="uk-margin-small">
                        <label class="uk-form-label kp-text">Restore To</label>
                        <select class="uk-select kp-input" id="import-target-site"></select>
                    </div>

                    <hr class="uk-divider-small">

                    <!-- upload section -->
                    <h4 class="kp-text uk-margin-small-bottom">Upload Archive</h4>
                    <p class="kp-muted uk-text-small uk-margin-small-bottom">
                        Maximum upload size is <strong>512 MB</strong>. For larger archives, transfer
                        the file to <span class="kp-mono">backups/import/</span> via SFTP and use
                        the <em>Import from SFTP</em> section below.
                    </p>
                    <div class="uk-margin-small">
                        <input type="file" class="uk-input kp-input" id="import-file-input"
                            accept=".tar.gz,.tar.xz,.zip">
                    </div>
                    <button class="uk-button kp-btn-primary kp-btn-sm uk-margin-small-top" id="import-upload-btn">
                        Upload &amp; Restore
                    </button>

                    <hr class="uk-divider-small uk-margin-small">

                    <!-- SFTP section -->
                    <h4 class="kp-text uk-margin-small-bottom">Import from SFTP</h4>
                    <p class="kp-muted uk-text-small uk-margin-small-bottom">
                        Files found in <span class="kp-mono">backups/import/</span> on this site's SFTP.
                    </p>
                    <div id="import-sftp-list">
                        <div uk-spinner="ratio: 0.6" style="color:var(--kp-blue)"></div>
                    </div>
                </div>
            </div>

        </div>`}function Ue(t){if(!t||t.length===0)return'<p class="kp-muted uk-text-small uk-margin-remove">No snapshots yet.</p>';let e=a=>a===2?'<span class="kp-mono" style="color:var(--kp-cyan)">S3</span>':'<span class="kp-mono" style="color:var(--kp-blue)">Local</span>';return`
        <div class="uk-overflow-auto">
        <table class="uk-table uk-table-small uk-table-divider uk-margin-remove">
            <thead>
                <tr>
                    <th>Snapshot ID</th>
                    <th>Label</th>
                    <th>Type</th>
                    <th>Size</th>
                    <th>Created</th>
                    <th></th>
                </tr>
            </thead>
            <tbody>${t.map(a=>`
        <tr>
            <td class="kp-mono" style="font-size:0.8rem">${g(a.SnapshotID)}</td>
            <td>${a.Label?g(a.Label):"\u2014"}</td>
            <td>${e(a.BackupType)}</td>
            <td>${E(a.SizeBytes)}</td>
            <td>${new Date(a.Created).toLocaleString()}</td>
            <td>
                <div class="uk-flex" style="gap:6px">
                    <button class="uk-button kp-btn-ghost kp-btn-sm backup-download-btn"
                        data-id="${a.ID}" uk-tooltip="Download backup archive">
                        <span uk-icon="download"></span>
                    </button>
                    <button class="uk-button kp-btn-secondary kp-btn-sm backup-restore-btn"
                        data-id="${a.ID}" uk-tooltip="Restore from this snapshot">
                        <span uk-icon="history"></span>
                    </button>
                    <button class="uk-button kp-btn-danger kp-btn-sm backup-delete-btn"
                        data-id="${a.ID}" uk-tooltip="Delete this snapshot">
                        <span uk-icon="trash"></span>
                    </button>
                </div>
            </td>
        </tr>`).join("")}</tbody>
        </table>
        </div>`}function Wt(t,e){let s=Date.now()+18e5,a=setInterval(async()=>{try{let o=await m.get(`/sites/${e}/backups/restore-status`);(!o?.active||Date.now()>s)&&(clearInterval(a),x(),o?.active?c.error("Import timed out \u2014 check server logs"):c.success("Import complete"),await j(t,e))}catch{}},3e3)}async function j(t,e){try{let[s,a]=await Promise.all([m.get(`/sites/${e}/backup-repo`),m.get(`/sites/${e}/backups`)]),o=t.querySelector("#backup-local-enabled"),n=t.querySelector("#backup-s3-enabled");o&&(o.checked=!!s.LocalEnabled),n&&(n.checked=!!s.S3Enabled);let r=t.querySelector("#backup-error-banner");if(r)if(s.last_error){let l=s.last_error_at?` (${new Date(s.last_error_at).toLocaleString()})`:"";r.innerHTML=`
                    <div uk-alert class="uk-alert-warning">
                        <a class="uk-alert-close" uk-close></a>
                        <p><strong>Last scheduled backup failed${l}:</strong> ${g(s.last_error)}</p>
                    </div>`}else r.innerHTML="";let i=t.querySelector("#backup-list-wrap");i&&(i.innerHTML=Ue(a))}catch(s){let a=t.querySelector("#backup-list-wrap");a&&(a.innerHTML=`<p class="kp-muted uk-text-small">Failed to load backups: ${g(s.message)}</p>`)}}function Ot(t,e){t.querySelector("#backup-repo-save")?.addEventListener("click",async()=>{let a={local_enabled:t.querySelector("#backup-local-enabled")?.checked??!1,s3_enabled:t.querySelector("#backup-s3-enabled")?.checked??!1};try{await m.put(`/sites/${e}/backup-repo`,a),c.success("Backup destinations saved")}catch(o){c.error(o.message)}}),t.querySelector("#backup-run-btn")?.addEventListener("click",async()=>{try{await m.post(`/sites/${e}/backups`,{label:"manual"})}catch(n){c.error(n.message);return}$("Backup Running","Snapshotting files and database \u2014 this may take a few minutes.");let a=Date.now()+1800*1e3,o=setInterval(async()=>{try{let n=await m.get(`/sites/${e}/backups/backup-status`);(!n?.active||Date.now()>a)&&(clearInterval(o),x(),await j(t,e),n?.active?c.error("Backup is taking longer than expected \u2014 check server logs for status"):n?.error?c.error(`Backup failed: ${n.error}`):c.success("Backup complete"))}catch{}},4e3)}),t.querySelector("#backup-list-wrap")?.addEventListener("click",async a=>{let o=a.target.closest(".backup-restore-btn");if(o){let i=o.dataset.id;if(!await L("Restore Site","This will restore the site from the selected snapshot. The site will show a maintenance page during the restore. Continue?"))return;try{await m.post(`/sites/${e}/backups/${i}/restore`)}catch(u){c.error(u.message);return}$("Restore Running","Restoring files and database \u2014 the site will return automatically when complete.");let d=Date.now(),k=Date.now()+900*1e3,b=setInterval(async()=>{try{let u=await m.get(`/sites/${e}/backups/restore-status`);(!u?.active||Date.now()>k)&&(clearInterval(b),x(),u?.active?c.error("Restore timed out"):c.success("Restore complete"),await j(t,e))}catch{}},3e3);return}let n=a.target.closest(".backup-delete-btn");if(n){let i=n.dataset.id;if(!await L("Delete Snapshot","This will permanently remove the snapshot from all configured repositories. This cannot be undone."))return;$("Deleting Snapshot","Removing snapshot data from repositories \u2014 this may take a moment.");try{await m.delete(`/sites/${e}/backups/${i}`),x(),c.success("Snapshot deleted"),await j(t,e)}catch(d){x(),c.error(d.message)}}let r=a.target.closest(".backup-download-btn");if(r){let i=r.dataset.id,l=`${Date.now().toString(36)}${Math.random().toString(36).slice(2,10)}`,d=`kp_dl_${l}`;$("Preparing Download","Your backup archive is being generated \u2014 this may take a moment depending on site size. Your download will begin automatically. Do not close this tab."),setTimeout(()=>{let k=document.createElement("a");k.href=`/api/sites/${e}/backups/${i}/download?dl=${l}`,k.style.display="none",document.body.appendChild(k),k.click(),document.body.removeChild(k);let b=Date.now(),u=setInterval(()=>{!document.cookie.split(";").some(v=>v.trim().startsWith(`${d}=`))&&Date.now()-b<18e5||(clearInterval(u),document.cookie=`${d}=; Path=/; Max-Age=0`,x())},500)},300);return}});let s=t.querySelector("#import-backup-modal");s&&(UIkit.util.on(s,"beforeshow",async()=>{let a=s.querySelector("#import-target-site");try{let n=await m.get("/sites"),r=Number(e);a.innerHTML=n.map(i=>`<option value="${i.ID}"${Number(i.ID)===r?" selected":""}>${i.Name}</option>`).join("")}catch{a.innerHTML='<option value="">Failed to load sites</option>'}let o=s.querySelector("#import-sftp-list");try{let n=await m.get(`/sites/${e}/backups/import/files`);!n||n.length===0?o.innerHTML='<p class="kp-muted uk-text-small">No files found.</p>':o.innerHTML=n.map(r=>`
                    <div class="uk-flex uk-flex-middle uk-flex-between uk-margin-small-bottom">
                        <span class="kp-mono uk-text-small">${g(r)}</span>
                        <button class="uk-button kp-btn-primary kp-btn-sm import-sftp-btn" data-file="${g(r)}">
                            Restore
                        </button>
                    </div>`).join("")}catch(n){o.innerHTML=`<p class="kp-muted uk-text-small">Failed to list files: ${g(n.message)}</p>`}}),s.querySelector("#import-upload-btn")?.addEventListener("click",async()=>{let a=s.querySelector("#import-file-input"),o=s.querySelector("#import-target-site")?.value;if(!a?.files?.length){c.error("Select an archive file first");return}let n=a.files[0],r=new FormData;r.append("archive",n),r.append("target_site_id",o),UIkit.modal(s).hide(),$("Importing Backup","Uploading and restoring \u2014 this may take several minutes.");try{await fetch(`/api/sites/${e}/backups/import/upload`,{method:"POST",headers:{"X-CSRF-Token":window.KP?.csrf??""},body:r,credentials:"same-origin"}).then(async i=>{if(!i.ok){let l=await i.json().catch(()=>({}));throw new Error(l.error||`HTTP ${i.status}`)}})}catch(i){x(),c.error(i.message);return}Wt(t,e)}),s.querySelector("#import-sftp-list")?.addEventListener("click",async a=>{let o=a.target.closest(".import-sftp-btn");if(!o)return;let n=o.dataset.file,r=s.querySelector("#import-target-site")?.value;UIkit.modal(s).hide(),$("Importing from SFTP","Restoring archive \u2014 this may take several minutes.");try{await m.post(`/sites/${e}/backups/import/sftp`,{filename:n,target_site_id:parseInt(r,10)})}catch(i){x(),c.error(i.message);return}Wt(t,e)}))}function ft(){return`
        <div class="kp-card uk-padding uk-margin-top" id="basicauth-panel">
            <h3 class="kp-view-title uk-margin-bottom">Basic Auth</h3>
            <p class="kp-muted uk-text-small uk-margin-small-bottom">
                Enforced at the proxy level \u2014 no nginx involvement. All requests to this
                site will require valid credentials before any content is served.
            </p>

            <div class="uk-grid-small uk-margin-bottom" uk-grid>
                <div class="uk-width-1-2@s">
                    <label class="kp-label">
                        <input class="uk-checkbox" type="checkbox" id="ba-enabled">
                        &nbsp;Enable Basic Auth
                    </label>
                </div>
                <div class="uk-width-1-2@s">
                    <label class="kp-label" for="ba-realm">Realm</label>
                    <input class="uk-input kp-input" type="text" id="ba-realm" placeholder="Restricted">
                </div>
            </div>

            <div class="uk-flex uk-flex-right uk-margin-bottom">
                <button class="uk-button kp-btn-primary kp-btn-sm" id="ba-config-save">
                    <span uk-icon="check"></span> Save Settings
                </button>
            </div>

            <hr class="kp-divider">

            <h4 class="kp-label uk-margin-small-bottom">Credentials</h4>
            <div id="ba-users-list" class="uk-margin-small-bottom"></div>

            <div class="uk-grid-small uk-margin-small-top" uk-grid>
                <div class="uk-width-1-3@s">
                    <input class="uk-input kp-input" type="text" id="ba-new-username" placeholder="Username">
                </div>
                <div class="uk-width-1-3@s">
                    <input class="uk-input kp-input" type="password" id="ba-new-password" placeholder="Password">
                </div>
                <div class="uk-width-1-3@s">
                    <button class="uk-button kp-btn-ghost" id="ba-add-user">
                        <span uk-icon="plus"></span> Add / Update
                    </button>
                </div>
            </div>
        </div>`}async function J(t){let e=document.getElementById("basicauth-panel");if(e)try{let[s,a]=await Promise.all([m.get(`/sites/${t}/basicauth`),m.get(`/sites/${t}/basicauth/users`)]),o=e.querySelector("#ba-enabled"),n=e.querySelector("#ba-realm");o&&(o.checked=!!s.Enabled),n&&(n.value=s.Realm??"Restricted"),Ne(e,a??[])}catch(s){c.error("Failed to load basic auth settings: "+s.message)}}function Ne(t,e){let s=t.querySelector("#ba-users-list");if(s){if(!e.length){s.innerHTML='<p class="kp-muted uk-text-small">No credentials configured.</p>';return}s.innerHTML=e.map(a=>`
        <div class="uk-flex uk-flex-middle uk-margin-small-bottom ba-user-row" data-uid="${a.id}" style="gap:8px">
            <span class="kp-mono" style="flex:1">${g(a.username)}</span>
            <a href="javascript:void(0);" class="kp-muted ba-delete-btn" uk-icon="trash" uk-tooltip="Remove credential"></a>
        </div>`).join("")}}function yt(t,e){let s=new AbortController,a={signal:s.signal};t.addEventListener("click",async o=>{if(!o.target.closest("#ba-config-save"))return;let n=t.querySelector("#ba-config-save"),r=n.innerHTML;n.disabled=!0,n.innerHTML='<div uk-spinner="ratio: 0.5"></div>';try{await m.put(`/sites/${e}/basicauth`,{enabled:t.querySelector("#ba-enabled").checked,realm:t.querySelector("#ba-realm").value.trim()||"Restricted"}),c.success("Basic auth settings saved")}catch(i){c.error(i.message)}finally{n.disabled=!1,n.innerHTML=r}},a),t.addEventListener("click",async o=>{if(!o.target.closest("#ba-add-user"))return;let n=t.querySelector("#ba-new-username").value.trim(),r=t.querySelector("#ba-new-password").value;if(!n||!r){c.error("Username and password are required");return}let i=t.querySelector("#ba-add-user"),l=i.innerHTML;i.disabled=!0,i.innerHTML='<div uk-spinner="ratio: 0.5"></div>';try{await m.put(`/sites/${e}/basicauth/users`,{username:n,password:r}),c.success(`Credential saved for ${n}`),t.querySelector("#ba-new-username").value="",t.querySelector("#ba-new-password").value="",await J(e)}catch(d){c.error(d.message)}finally{i.disabled=!1,i.innerHTML=l}},a),t.addEventListener("click",async o=>{let n=o.target.closest(".ba-delete-btn");if(!n)return;let r=n.closest(".ba-user-row")?.dataset.uid;if(r)try{await m.delete(`/sites/${e}/basicauth/users/${r}`),c.success("Credential removed"),await J(e)}catch(i){c.error(i.message)}},a),t.__basicAuthAbort?.abort(),t.__basicAuthAbort=s}var X={1:"Nginx",2:"PHP",3:"MariaDB",4:"Redis",5:"Varnish"};function Q(t,e,s){let a=s?Object.entries(s):[];return`
        <div>
            <div class="uk-flex uk-flex-between uk-flex-middle uk-margin-small-bottom">
                <div class="uk-flex uk-flex-middle" style="gap:10px">
                    <h4 class="kp-view-title uk-margin-remove">${X[e]}</h4>
                </div>
                <div class="uk-flex" style="gap:8px">
                    <button class="uk-button kp-btn-ghost kp-btn-sm cfg-add-row" data-type="${e}" uk-tooltip="Add a Key">
                        <span uk-icon="plus"></span>
                    </button>
                    <button class="uk-button kp-btn-secondary kp-btn-sm cfg-save" data-type="${e}" data-site="${t}" uk-tooltip="Save the Configuration">
                        <span uk-icon="check"></span>
                    </button>
                    <button class="uk-button kp-btn-ghost kp-btn-sm cfg-reset" data-type="${e}" data-site="${t}" uk-tooltip="Reset to Defaults">
                        <span uk-icon="refresh"></span>
                    </button>
                    <a class="uk-button kp-btn-ghost kp-btn-sm" href="/api/sites/${t}/configs/${e}/export" download="${t}-config-${e}.csv" uk-tooltip="Export config as CSV">
                        <span uk-icon="download"></span>
                    </a>
                    <label class="uk-button kp-btn-ghost kp-btn-sm cfg-import-label" data-type="${e}" data-site="${t}" uk-tooltip="Import config from CSV" style="cursor:pointer">
                        <span uk-icon="upload"></span>
                        <input type="file" class="cfg-import-input" accept=".csv" style="display:none" data-type="${e}" data-site="${t}">
                    </label>
                </div>
            </div>
            <div class="kp-config-grid cfg-rows" data-type="${e}">
                ${a.map(([o,n])=>G(o,n)).join("")}
            </div>
        </div>`}function zt(t,e){let s=e?.enabled==="true",a=e?Object.entries(e).filter(([o])=>o!=="enabled"):[];return`
        <div>
            <div class="uk-flex uk-flex-between uk-flex-middle uk-margin-small-bottom" uk-tooltip="Add a Key">
                <div class="uk-flex uk-flex-middle" style="gap:10px">
                    <h4 class="kp-view-title uk-margin-remove">Varnish</h4>
                </div>
                <div class="uk-flex" style="gap:8px">
                    <button class="uk-button kp-btn-ghost kp-btn-sm cfg-add-row" data-type="5">
                        <span uk-icon="plus"></span>
                    </button>
                    <button class="uk-button kp-btn-secondary kp-btn-sm cfg-save" data-type="5" data-site="${t}" uk-tooltip="Save the Configuration">
                        <span uk-icon="check"></span>
                    </button>
                    <button class="uk-button kp-btn-ghost kp-btn-sm cfg-reset" data-type="5" data-site="${t}" uk-tooltip="Reset to Defaults">
                        <span uk-icon="refresh"></span>
                    </button>
                    <a class="uk-button kp-btn-ghost kp-btn-sm" href="/api/sites/${t}/configs/5/export" download="${t}-config-5.csv" uk-tooltip="Export config as CSV">
                        <span uk-icon="download"></span>
                    </a>
                    <label class="uk-button kp-btn-ghost kp-btn-sm cfg-import-label" data-type="5" data-site="${t}" uk-tooltip="Import config from CSV" style="cursor:pointer">
                        <span uk-icon="upload"></span>
                        <input type="file" class="cfg-import-input" accept=".csv" style="display:none" data-type="5" data-site="${t}">
                    </label>
                </div>
            </div>

            <!-- enable/disable toggle \u2014 requires pod recreate to take effect -->
            <div class="uk-margin-small-bottom" style="background:var(--kp-surface-2);padding:10px 12px;border-radius:6px">
                <label class="uk-flex uk-flex-middle" style="gap:10px;cursor:pointer">
                    <input type="checkbox" class="uk-checkbox varnish-enabled-toggle" ${s?"checked":""}>
                    <span>Enable Varnish Cache</span>
                    <span class="kp-muted uk-text-small">\u2014 requires pod recreate to take effect</span>
                </label>
            </div>

            <div class="kp-config-grid cfg-rows" data-type="5">
                ${a.map(([o,n])=>G(o,n)).join("")}
            </div>
        </div>`}function G(t="",e=""){return`<div class="kp-config-row">
        <div class="kp-config-key">
            <input class="cfg-key" type="text" value="${t}" placeholder="key">
        </div>
        <div class="kp-config-val">
            <input class="cfg-val" type="text" value="${e}" placeholder="value">
        </div>
        <button class="kp-config-del cfg-del-row" title="Remove">
            <span uk-icon="icon: close; ratio: 0.8"></span>
        </button>
    </div>`}function Vt(t,e,s){t.addEventListener("click",a=>{if(a.target.closest(".cfg-add-row")){let o=a.target.closest(".cfg-add-row");t.querySelector(`.cfg-rows[data-type="${o.dataset.type}"]`).insertAdjacentHTML("beforeend",G())}},{signal:s}),t.addEventListener("click",a=>{a.target.closest(".cfg-del-row")&&a.target.closest(".kp-config-row").remove()},{signal:s}),t.addEventListener("click",async a=>{let o=a.target.closest(".cfg-save");if(!o)return;let{type:n,site:r}=o.dataset,i=t.querySelectorAll(`.cfg-rows[data-type="${n}"] .kp-config-row`),l={};if(i.forEach(d=>{let k=d.querySelector(".cfg-key").value.trim(),b=d.querySelector(".cfg-val").value.trim();k&&(l[k]=b)}),n==="5"){let d=t.querySelector(".varnish-enabled-toggle");l.enabled=d?.checked?"true":"false"}try{await m.put(`/sites/${r}/configs/${n}`,l),c.success(`${X[n]} config saved`)}catch(d){c.error(d.message)}},{signal:s}),t.addEventListener("click",async a=>{let o=a.target.closest(".cfg-reset");if(!o)return;let{type:n,site:r}=o.dataset;if(await L("Reset Config",`Reset ${X[n]} config to defaults?`))try{let l=await m.post(`/sites/${r}/configs/${n}/reset`),d=t.querySelector(`.cfg-rows[data-type="${n}"]`);d.innerHTML=Object.entries(l).map(([k,b])=>G(k,b)).join(""),c.success(`${X[n]} reset to defaults`)}catch(l){c.error(l.message)}},{signal:s}),t.addEventListener("change",async a=>{let o=a.target.closest(".cfg-import-input");if(!o)return;let{type:n,site:r}=o.dataset,i=o.files[0];if(!i)return;let l=new FormData;l.append("file",i);try{let d=await fetch(`/api/sites/${r}/configs/${n}/import`,{method:"POST",headers:{"X-CSRF-Token":window.KP?.csrf??""},body:l}),k=d.status===204?null:await d.json().catch(()=>null);if(!d.ok)throw new Error(k?.error||`HTTP ${d.status}`);let b=t.querySelector(`.cfg-rows[data-type="${n}"]`);b.innerHTML=Object.entries(k).map(([u,p])=>G(u,p)).join(""),c.success(`${X[n]} config imported`)}catch(d){c.error(d.message)}finally{o.value=""}},{signal:s})}function Jt(t){return`
        <div id="crons-panel" data-site-id="${t}">
            <div class="kp-card uk-padding-small">
                <div class="uk-flex uk-flex-between uk-flex-middle uk-margin-small-bottom">
                    <h3 class="kp-view-title">Cron Jobs</h3>
                    <button class="uk-button kp-btn-primary kp-btn-sm" id="cron-add-btn" uk-tooltip="Add Cron Job">
                        <span uk-icon="plus"></span>
                    </button>
                </div>
                <div id="cron-list-wrap">
                    <div uk-spinner="ratio: 0.8" style="color:var(--kp-blue)"></div>
                </div>
            </div>

            <!-- add / edit modal -->
            <div id="cron-modal" uk-modal>
                <div class="uk-modal-dialog kp-modal uk-modal-body uk-width-large">
                    <button class="uk-modal-close-default" type="button" uk-close></button>
                    <h3 class="kp-view-title" id="cron-modal-title">Add Cron Job</h3>
                    <div class="uk-form-stacked uk-margin-top">
                        <div class="uk-grid-small" uk-grid>
                            <input type="hidden" id="cron-modal-id">
                            <div class="uk-width-1-1">
                                <label class="kp-label">Label</label>
                                <input class="uk-input kp-input" type="text" id="cron-modal-label" placeholder="e.g. Daily cleanup">
                            </div>
                            <div class="uk-width-1-1">
                                <label class="kp-label">Command</label>
                                <textarea class="uk-textarea kp-textarea kp-mono" id="cron-modal-command" rows="3"
                                    placeholder="e.g. php /var/www/html/artisan schedule:run"></textarea>
                            </div>
                            <div class="uk-width-1-1">
                                <label class="kp-label">Schedule <span class="kp-muted uk-text-small">(5-field cron expression)</span></label>
                                <input class="uk-input kp-input kp-mono" type="text" id="cron-modal-schedule" placeholder="e.g. 0 3 * * *">
                                <p class="kp-muted uk-text-small uk-margin-small-top uk-margin-remove-bottom" id="cron-schedule-preview"></p>
                            </div>
                            <div class="uk-width-1-1">
                                <label class="uk-flex uk-flex-middle" style="gap:8px;cursor:pointer">
                                    <input type="checkbox" class="uk-checkbox" id="cron-modal-enabled" checked>
                                    <span class="kp-text">Enabled</span>
                                </label>
                            </div>
                        </div>
                        <div class="uk-flex uk-flex-right uk-margin-top" style="gap:8px">
                            <button class="uk-button kp-btn-ghost uk-modal-close">Cancel</button>
                            <button class="uk-button kp-btn-primary" id="cron-modal-save">Save</button>
                        </div>
                    </div>
                </div>
            </div>

        </div>`}function Xt(t){if(!t||t.length===0)return'<p class="kp-muted uk-text-small uk-margin-remove">No cron jobs configured.</p>';let e=a=>a?new Date(a).toLocaleString():"\u2014";return`
        <div class="uk-overflow-auto">
        <table class="uk-table uk-table-divider uk-table-small uk-table-middle kp-fm-table">
            <thead>
                <tr>
                    <th>Label</th>
                    <th>Schedule</th>
                    <th>Last Run</th>
                    <th>Status</th>
                    <th>Enabled</th>
                    <th></th>
                </tr>
            </thead>
            <tbody>${t.map(a=>`
        <tr>
            <td class="kp-text">${a.Label||'<span class="kp-muted">\u2014</span>'}</td>
            <td class="kp-mono kp-text-sm">${a.Schedule}</td>
            <td class="kp-muted uk-text-small">${e(a.LastRun)}</td>
            <td>
                ${a.LastError?'<span class="kp-badge kp-badge-error">Error</span>':a.LastRun?'<span class="kp-badge kp-badge-success">OK</span>':'<span class="kp-muted uk-text-small">\u2014</span>'}
                ${a.LastOutput||a.LastError?`<a class="kp-cron-detail-btn cron-detail-btn" data-id="${a.ID}" uk-tooltip="View Run Details">
                            <span uk-icon="icon: info; ratio: 0.75"></span>
                        </a>`:""}
            </td>
            <td>
                <input type="checkbox" class="uk-checkbox cron-toggle"
                    data-id="${a.ID}" ${a.Enabled?"checked":""}>
            </td>
            <td>
                <div class="uk-flex kp-cron-actions">
                    <button class="uk-button kp-btn-ghost kp-btn-sm cron-run-btn"
                        data-id="${a.ID}" uk-tooltip="Run Now">
                        <span uk-icon="play"></span>
                    </button>
                    <button class="uk-button kp-btn-ghost kp-btn-sm cron-edit-btn"
                        data-id="${a.ID}" uk-tooltip="Edit">
                        <span uk-icon="pencil"></span>
                    </button>
                    <button class="uk-button kp-btn-danger kp-btn-sm cron-delete-btn"
                        data-id="${a.ID}" uk-tooltip="Delete">
                        <span uk-icon="trash"></span>
                    </button>
                </div>
            </td>
        </tr>`).join("")}</tbody>
        </table>
        </div>`}async function rt(t,e){let s=t.querySelector("#cron-list-wrap");if(s)try{let a=await m.get(`/sites/${e}/crons`);s.innerHTML=Xt(a)}catch(a){s.innerHTML=`<p class="kp-muted uk-text-small">Failed to load cron jobs: ${g(a.message)}</p>`}}function Gt(t,e){let s=[],a=t.querySelector("#cron-modal"),o=t.querySelector("#cron-modal-title"),n=t.querySelector("#cron-modal-id"),r=t.querySelector("#cron-modal-label"),i=t.querySelector("#cron-modal-command"),l=t.querySelector("#cron-modal-schedule"),d=t.querySelector("#cron-schedule-preview"),k=t.querySelector("#cron-modal-enabled");l?.addEventListener("input",()=>{d.textContent=Kt(l.value.trim())}),t.querySelector("#cron-add-btn")?.addEventListener("click",()=>{o.textContent="Add Cron Job",n.value="",r.value="",i.value="",l.value="",d.textContent="",k.checked=!0,UIkit.modal(a).show()}),t.querySelector("#cron-modal-save")?.addEventListener("click",async()=>{let b=i.value.trim(),u=l.value.trim();if(!b||!u){c.error("Command and schedule are required");return}let p={label:r.value.trim(),command:b,schedule:u,enabled:k.checked},v=n.value;try{v?(await m.put(`/sites/${e}/crons/${v}`,p),c.success("Cron job updated")):(await m.post(`/sites/${e}/crons`,p),c.success("Cron job created")),UIkit.modal(a).hide(),await rt(t,e),s=await m.get(`/sites/${e}/crons`)}catch(h){c.error(h.message)}}),t.querySelector("#cron-list-wrap")?.addEventListener("click",async b=>{let u=b.target.closest(".cron-detail-btn");if(u){let f=u.dataset.id,w=s.find(T=>String(T.ID)===f);if(!w)return;document.body.insertAdjacentHTML("beforeend",`
                <div id="cron-detail-modal" uk-modal>
                    <div class="uk-modal-dialog kp-modal uk-modal-body uk-width-large">
                        <button class="uk-modal-close-default" type="button" uk-close></button>
                        <h3 class="kp-view-title uk-margin-bottom">Run Details \u2014 ${g(w.Label||String(w.ID))}</h3>
                        <div class="uk-margin-small-bottom">
                            <label class="kp-label">Output</label>
                            <pre class="kp-cron-output">${g(w.LastOutput||"(no output)")}</pre>
                        </div>
                        <div class="uk-margin-small-top">
                            <label class="kp-label">Error</label>
                            <pre class="kp-cron-output kp-cron-output-error">${g(w.LastError||"(no error)")}</pre>
                        </div>
                    </div>
                </div>`);let S=document.getElementById("cron-detail-modal");UIkit.modal(S).show(),S.addEventListener("hidden",()=>S.remove(),{once:!0});return}let p=b.target.closest(".cron-edit-btn");if(p){let f=p.dataset.id,w=s.find(S=>String(S.ID)===f);if(!w)return;o.textContent="Edit Cron Job",n.value=w.ID,r.value=w.Label||"",i.value=w.Command,l.value=w.Schedule,d.textContent=Kt(w.Schedule),k.checked=w.Enabled,UIkit.modal(a).show();return}let v=b.target.closest(".cron-delete-btn");if(v){let f=v.dataset.id;if(!await L("Delete Cron Job","This will permanently remove the cron job. Continue?"))return;try{await m.delete(`/sites/${e}/crons/${f}`),c.success("Cron job deleted"),await rt(t,e),s=await m.get(`/sites/${e}/crons`)}catch(S){c.error(S.message)}return}let h=b.target.closest(".cron-run-btn");if(h){let f=h.dataset.id;try{await m.post(`/sites/${e}/crons/${f}/run`)}catch(B){c.error(B.message);return}$("Running Cron Job","Executing the job inside the container \u2014 please wait.");let w=null;try{w=(await m.get(`/sites/${e}/crons`)).find(D=>String(D.ID)===f)?.LastRun??null}catch{}let S=Date.now()+300*1e3,T=setInterval(async()=>{try{let B=await m.get(`/sites/${e}/crons`),D=B.find(Z=>String(Z.ID)===f);if(!D||D.LastRun!==w||Date.now()>S){clearInterval(T),x(),s=B??[];let Z=t.querySelector("#cron-list-wrap");Z&&(Z.innerHTML=Xt(B)),D?.LastError?c.error(`Job failed: ${D.LastError}`):c.success("Cron job complete")}}catch{}},2e3);return}}),t.querySelector("#cron-list-wrap")?.addEventListener("change",async b=>{let u=b.target.closest(".cron-toggle");if(!u)return;let p=u.dataset.id;try{await m.patch(`/sites/${e}/crons/${p}/toggle`,{enabled:u.checked}),c.success(u.checked?"Cron job enabled":"Cron job disabled")}catch(v){c.error(v.message),u.checked=!u.checked}}),m.get(`/sites/${e}/crons`).then(b=>{s=b??[]}).catch(()=>{})}function Kt(t){if(!t)return"";let e=t.trim().split(/\s+/);if(e.length!==5)return"invalid expression";let[s,a,o,n,r]=e;if(t==="* * * * *")return"every minute";if(s!=="*"&&a!=="*"&&o==="*"&&n==="*"&&r==="*")return`daily at ${a.padStart(2,"0")}:${s.padStart(2,"0")}`;if(s!=="*"&&a!=="*"&&o==="*"&&n==="*"&&r!=="*"){let i=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];return`weekly on ${r.split(",").map(d=>i[parseInt(d)]??d).join(", ")} at ${a.padStart(2,"0")}:${s.padStart(2,"0")}`}return s.startsWith("*/")?`every ${s.slice(2)} minutes`:a.startsWith("*/")?`every ${a.slice(2)} hours`:t}var I="";function ee(t){return`
        <div class="kp-card uk-padding uk-margin-top" id="fm-root" data-site="${t}">
            <div class="uk-flex uk-flex-middle uk-flex-between uk-margin-bottom" style="gap:8px;flex-wrap:wrap">
                <nav id="fm-breadcrumb" class="kp-fm-breadcrumb uk-text-small"></nav>
                <div class="uk-flex" style="gap:8px;flex-wrap:wrap">
                    <button class="uk-button kp-btn-ghost kp-btn-sm" id="fm-new-file" uk-tooltip="New File"><span uk-icon="file-edit"></span></button>
                    <button class="uk-button kp-btn-ghost kp-btn-sm" id="fm-new-dir" uk-tooltip="New Folder"><span uk-icon="folder"></span></button>
                    <label class="uk-button kp-btn-ghost kp-btn-sm" style="cursor:pointer" uk-tooltip="Upload">
                        <span uk-icon="upload"></span>
                        <input type="file" id="fm-upload" multiple style="display:none">
                    </label>
                    <button class="uk-button kp-btn-ghost kp-btn-sm" id="fm-refresh" uk-tooltip="Refresh"><span uk-icon="refresh"></span></button>
                </div>
            </div>
            <div id="fm-list"></div>
        </div>`}function We(){let t=I?I.split("/"):[],e="",s=['<a href="#" data-path="">html</a>'];for(let a of t)e=e?e+"/"+a:a,s.push(`<span class="kp-fm-sep">/</span><a href="#" data-path="${g(e)}">${g(a)}</a>`);return s.join("")}function je(t){let e=new Date(t);return isNaN(e)?"":e.toLocaleString(void 0,{year:"numeric",month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})}function Qt(t){return t==="d"?"folder":t==="l"?"link":"file-text"}function O(t,e){return t?t+"/"+e:e}var Yt=new Set(["php","js","jsx","ts","tsx","css","scss","sass","less","html","htm","xml","json","txt","md","markdown","yml","yaml","ini","conf","cnf","toml","env","sh","bash","sql","log","csv","tsv","svg","htaccess","gitignore","lock","map"]);function Oe(t,e){if(e)return!1;let s=t.lastIndexOf(".");return t.startsWith(".")&&s===0?Yt.has(t.slice(1).toLowerCase()):s>=0&&Yt.has(t.slice(s+1).toLowerCase())}function ze(t){if(!t||!t.length)return et("folder","This folder is empty");let e=document.getElementById("fm-root").dataset.site;return`
        <table class="uk-table uk-table-divider uk-table-small uk-table-middle kp-fm-table">
            <thead>
                <tr>
                    <th>Name</th><th>Size</th><th>Perms</th><th>Modified</th><th></th>
                </tr>
            </thead>
            <tbody>${t.map(a=>{let o=O(I,a.name),n=a.is_dir,r=Oe(a.name,n),i=n?`<a href="#" class="fm-nav" data-path="${g(o)}"><span uk-icon="icon: ${Qt(a.type)}; ratio: 0.9"></span> ${g(a.name)}</a>`:`<span><span uk-icon="icon: ${Qt(a.type)}; ratio: 0.9"></span> ${g(a.name)}</span>`;return`
            <tr data-path="${g(o)}" data-name="${g(a.name)}" data-dir="${n?1:0}" data-mode="${g(a.mode)}">
                <td class="kp-fm-name">${i}</td>
                <td class="uk-text-nowrap">${E(a.size,n)}</td>
                <td><code class="kp-mono">${g(a.mode)}</code></td>
                <td class="uk-text-nowrap uk-text-small kp-muted">${je(a.mod_time)}</td>
                <td class="uk-text-right uk-text-nowrap">
                    ${r?`<button class="kp-fm-act fm-edit" data-path="${g(o)}" uk-tooltip="Edit"><span uk-icon="icon: pencil; ratio: 0.85"></span></button>`:""}
                    ${n?"":`<a class="kp-fm-act fm-download" href="/api/sites/${e}/files/download?path=${encodeURIComponent(o)}" uk-tooltip="Download"><span uk-icon="icon: download; ratio: 0.85"></span></a>`}
                    <button class="kp-fm-act fm-chmod" uk-tooltip="Permissions"><span uk-icon="icon: settings; ratio: 0.85"></span></button>
                    <button class="kp-fm-act fm-rename" uk-tooltip="Rename / Move"><span uk-icon="icon: move; ratio: 0.85"></span></button>
                    <button class="kp-fm-act fm-copy" uk-tooltip="Copy"><span uk-icon="icon: copy; ratio: 0.85"></span></button>
                    <button class="kp-fm-act fm-delete" uk-tooltip="Delete"><span uk-icon="icon: trash; ratio: 0.85"></span></button>
                </td>
            </tr>`}).join("")}</tbody>
        </table>`}async function C(t){let e=document.getElementById("fm-list"),s=document.getElementById("fm-breadcrumb");if(e){e.innerHTML=tt(),s&&(s.innerHTML=We());try{let a=await m.get(`/sites/${t}/files?path=${encodeURIComponent(I)}`);e.innerHTML=ze(a)}catch(a){e.innerHTML=P("Failed to list files: "+a.message)}}}function Zt(t,e){I=e||"",C(t)}function Y(t,e,s=""){return new Promise(a=>{let o="fm-prompt-modal";document.getElementById(o)?.remove();let n=document.createElement("div");n.id=o,n.setAttribute("uk-modal",""),n.innerHTML=`
            <div class="uk-modal-dialog uk-modal-body kp-modal">
                <h3 class="uk-modal-title">${g(t)}</h3>
                <label class="kp-label uk-margin-small-bottom">${g(e)}</label>
                <input class="uk-input kp-input" id="fm-prompt-input" value="${g(s)}" autocomplete="off">
                <div class="uk-flex uk-flex-right uk-margin-top" style="gap:8px">
                    <button class="uk-button kp-btn-ghost uk-modal-close">Cancel</button>
                    <button class="uk-button kp-btn-primary" id="fm-prompt-ok">OK</button>
                </div>
            </div>`,document.body.appendChild(n),window.UIkit&&UIkit.icon(n);let r=UIkit.modal(n),i=n.querySelector("#fm-prompt-input"),l=!1,d=k=>{l||(l=!0,a(k),r.hide())};n.querySelector("#fm-prompt-ok").addEventListener("click",()=>d(i.value.trim()||null)),i.addEventListener("keydown",k=>{k.key==="Enter"&&(k.preventDefault(),d(i.value.trim()||null))}),UIkit.util.on(n,"hidden",()=>{l||(l=!0,a(null)),n.remove()}),r.show(),setTimeout(()=>i.focus(),50)})}async function Ve(t,e){let s=O(I,e.name),a=await fetch(`/api/sites/${t}/files/upload?path=${encodeURIComponent(s)}`,{method:"POST",headers:{"X-CSRF-Token":window.KP?.csrf??""},body:e}),o=a.status===204?null:await a.json().catch(()=>null);if(!a.ok)throw new Error(o?.error||`HTTP ${a.status}`)}function se(t,e){I="",t.addEventListener("click",s=>{let a=s.target.closest("#fm-breadcrumb a");if(a){s.preventDefault(),Zt(e,a.dataset.path);return}let o=s.target.closest(".fm-nav");if(o){s.preventDefault(),Zt(e,o.dataset.path);return}let n=s.target.closest(".fm-edit");if(n){s.preventDefault(),Xe(e,n.dataset.path,n.dataset.path.split("/").pop());return}}),t.querySelector("#fm-new-file")?.addEventListener("click",async()=>{let s=await Y("New File","File name");if(s)try{await m.post(`/sites/${e}/files/file`,{path:O(I,s)}),C(e)}catch(a){c.error(a.message)}}),t.querySelector("#fm-new-dir")?.addEventListener("click",async()=>{let s=await Y("New Folder","Folder name");if(s)try{await m.post(`/sites/${e}/files/dir`,{path:O(I,s)}),C(e)}catch(a){c.error(a.message)}}),t.querySelector("#fm-upload")?.addEventListener("change",async s=>{let a=[...s.target.files];if(a.length)try{for(let o of a)await Ve(e,o);c.success(a.length===1?"File uploaded":`${a.length} files uploaded`),C(e)}catch(o){c.error(o.message)}finally{s.target.value=""}}),t.querySelector("#fm-refresh")?.addEventListener("click",()=>C(e)),t.addEventListener("click",async s=>{let a=s.target.closest("tr[data-path]");if(!a)return;let o=a.dataset.path,n=a.dataset.name;if(s.target.closest(".fm-chmod")){let r=await Y("Permissions",`Octal mode for "${n}"`,a.dataset.mode);if(!r)return;try{await m.patch(`/sites/${e}/files/chmod`,{path:o,mode:r}),C(e)}catch(i){c.error(i.message)}return}if(s.target.closest(".fm-rename")){let r=await Y("Rename / Move","New path (relative to current folder)",n);if(!r||r===n)return;try{await m.post(`/sites/${e}/files/move`,{src:o,dst:O(I,r)}),C(e)}catch(i){c.error(i.message)}return}if(s.target.closest(".fm-copy")){let r=await Y("Copy","Destination name",n+"-copy");if(!r)return;try{await m.post(`/sites/${e}/files/copy`,{src:o,dst:O(I,r)}),C(e)}catch(i){c.error(i.message)}return}if(s.target.closest(".fm-delete")){if(!await L("Delete",`Delete "${n}"? This cannot be undone.`))return;try{await m.delete(`/sites/${e}/files?path=${encodeURIComponent(o)}`),C(e)}catch(i){c.error(i.message)}return}})}var ct=null;function te(t){if(document.querySelector(`link[href="${t}"]`))return;let e=document.createElement("link");e.rel="stylesheet",e.href=t,document.head.appendChild(e)}function wt(t){return new Promise((e,s)=>{let a=document.querySelector(`script[src="${t}"]`);if(a){if(a.dataset.loaded)return e();a.addEventListener("load",()=>e()),a.addEventListener("error",()=>s(new Error("failed to load "+t)));return}let o=document.createElement("script");o.src=t,o.addEventListener("load",()=>{o.dataset.loaded="1",e()}),o.addEventListener("error",()=>s(new Error("failed to load "+t))),document.head.appendChild(o)})}function Ke(){if(ct)return ct;let t="https://cdn.jsdelivr.net/npm/codemirror@5";return te(`${t}/lib/codemirror.css`),te(`${t}/theme/material-darker.css`),ct=wt(`${t}/lib/codemirror.js`).then(()=>Promise.all([wt(`${t}/mode/meta.js`),wt(`${t}/addon/mode/loadmode.js`)])).then(()=>{window.CodeMirror.modeURL=`${t}/mode/%N/%N.js`}),ct}function Je(t){let e=window.CodeMirror.findModeByFileName(t);return e?e.mode:null}async function Xe(t,e,s){let a;try{a=await m.get(`/sites/${t}/files/content?path=${encodeURIComponent(e)}`)}catch(u){let p=/too large/i.test(u.message)?"File is too large to edit \u2014 download it instead.":/binary/i.test(u.message)?"Binary file \u2014 download it instead of editing.":u.message;c.error(p);return}try{await Ke()}catch(u){c.error("Editor failed to load: "+u.message);return}let o="fm-editor-modal";document.getElementById(o)?.remove();let n=document.createElement("div");n.id=o,n.setAttribute("uk-modal",""),n.innerHTML=`
        <div class="uk-modal-dialog kp-modal kp-fm-editor-dialog">
            <div class="uk-flex uk-flex-middle uk-flex-between uk-padding-small">
                <h3 class="uk-modal-title uk-margin-remove"><span uk-icon="file-text"></span> ${g(s)} <span id="fm-ed-dirty" class="kp-muted uk-text-small" hidden>\u2022 unsaved</span></h3>
                <div class="uk-flex" style="gap:8px">
                    <button class="uk-button kp-btn-primary kp-btn-sm" id="fm-ed-save"><span uk-icon="icon: check; ratio: 0.85"></span> Save</button>
                    <button class="uk-button kp-btn-ghost kp-btn-sm uk-modal-close"><span uk-icon="icon: close; ratio: 0.85"></span></button>
                </div>
            </div>
            <div class="kp-fm-editor-body">
                <textarea id="fm-ed-area"></textarea>
            </div>
        </div>`,document.body.appendChild(n),window.UIkit&&UIkit.icon(n);let r=UIkit.modal(n,{bgClose:!1,escClose:!0}),i=n.querySelector("#fm-ed-dirty"),l=null,d=!0,k=u=>{d=!u,i.hidden=!u};UIkit.util.on(n,"shown",()=>{if(l)return;l=window.CodeMirror.fromTextArea(n.querySelector("#fm-ed-area"),{value:a.content,lineNumbers:!0,theme:"material-darker",indentUnit:4,lineWrapping:!1,extraKeys:{"Ctrl-S":b,"Cmd-S":b,"Ctrl-F":"findPersistent","Ctrl-/":"toggleComment"}}),l.setValue(a.content),l.on("change",()=>k(!0));let u=Je(s);u&&(l.setOption("mode",u),window.CodeMirror.autoLoadMode(l,u)),setTimeout(()=>l.refresh(),30)}),UIkit.util.on(n,"hidden",()=>n.remove());async function b(){if(!l)return;let u=n.querySelector("#fm-ed-save"),p=u.innerHTML;u.disabled=!0,u.innerHTML='<div uk-spinner="ratio: 0.6"></div>';try{await m.put(`/sites/${t}/files/content`,{path:e,content:l.getValue()}),k(!1),c.success("Saved"),C(t)}catch(v){c.error(v.message)}finally{u.disabled=!1,u.innerHTML=p}}n.querySelector("#fm-ed-save").addEventListener("click",b),UIkit.util.on(n,"beforehide",u=>{!d&&!window.confirm("Discard unsaved changes?")&&u.preventDefault()}),r.show()}var Ge=2e3;function xt(t,e){return`
        <div>
            <div class="kp-log-controls">
                <select class="uk-select kp-select" id="log-container" style="width:140px;height:38px">
                    ${e===6?'<option value="access">Access Log</option><option value="waf">WAF Log</option>':`<option value="access">Access</option>
            <option value="nginx">Nginx</option>
                    ${(()=>{switch(e){case 1:case 2:return'<option value="php">PHP-FPM</option>';case 4:return'<option value="app">Node.js</option>';case 5:return'<option value="app">.NET</option>';case 7:return'<option value="app">Python</option>';default:return""}})()}
                    <option value="waf">WAF Log</option>`}
                </select>
                <select class="uk-select kp-select" id="log-tail" style="width:120px;height:38px">
                    <option value="100">100 lines</option>
                    <option value="250">250 lines</option>
                    <option value="500">500 lines</option>
                    <option value="1000">1000 lines</option>
                </select>
                <button class="uk-button kp-btn-secondary kp-btn-sm" id="log-connect" uk-tooltip="Start Tailing the Logs">
                    <span uk-icon="play"></span>
                </button>
                <button class="uk-button kp-btn-ghost kp-btn-sm" id="log-disconnect" disabled uk-tooltip="Stop Tailing the Logs">
                    <span uk-icon="ban"></span>
                </button>
                <button class="uk-button kp-btn-ghost kp-btn-sm" id="log-clear" uk-tooltip="Clear the Logs">
                    <span uk-icon="trash"></span>
                </button>
                <label style="font-size:0.82rem;color:var(--kp-text-dim);display:flex;align-items:center;gap:6px">
                    <input type="checkbox" class="uk-checkbox" id="log-autoscroll" checked>
                    Auto-scroll
                </label>
            </div>
            <div class="kp-log-header">
                <div class="kp-log-dot kp-log-dot-red"></div>
                <div class="kp-log-dot kp-log-dot-yellow"></div>
                <div class="kp-log-dot kp-log-dot-green"></div>
                <span style="font-size:0.72rem;color:var(--kp-text-dim);margin-left:8px" id="log-status">Disconnected</span>
            </div>
            <div class="kp-log-wrap" id="log-output"></div>
        </div>`}function ae(t,e){let s=null,a=!1,o=t.querySelector("#log-output"),n=t.querySelector("#log-connect"),r=t.querySelector("#log-disconnect"),i=t.querySelector("#log-clear"),l=t.querySelector("#log-autoscroll"),d=t.querySelector("#log-status");function k(p){for(p.split(`
`).forEach(v=>{if(!v)return;let h=document.createElement("div");h.className=v.match(/WAF BLOCK/i)?"kp-log-line-err":v.match(/WAF DETECT/i)?"kp-log-line-warn":v.match(/error|crit|emerg/i)?"kp-log-line-err":v.match(/warn/i)?"kp-log-line-warn":v.match(/info|notice/i)?"kp-log-line-info":"",h.textContent=v,o.appendChild(h)});o.childElementCount>Ge;)o.removeChild(o.firstChild);l.checked&&(o.scrollTop=o.scrollHeight)}function b(){s&&(s.close(),s=null),a=!1,n.disabled=!1,r.disabled=!0,d&&(d.textContent="Disconnected")}n.addEventListener("click",()=>{b();let p=t.querySelector("#log-container").value,v=t.querySelector("#log-tail").value,h=location.protocol==="https:"?"wss":"ws",f=p==="waf"?`${h}://${location.host}/api/sites/${e}/logs/waf?tail=${v}`:p==="proxy"?`${h}://${location.host}/api/sites/${e}/logs/proxy?tail=${v}`:p==="access"?`${h}://${location.host}/api/sites/${e}/logs/proxy?tail=${v}`:`${h}://${location.host}/api/sites/${e}/logs?container=${p}&tail=${v}`;s=new WebSocket(f),s.onopen=()=>{a=!0,n.disabled=!0,r.disabled=!1,d&&(d.textContent=`Connected \u2014 ${p}`)},s.onmessage=w=>k(w.data),s.onerror=()=>{},s.onclose=()=>{a=!1,n.disabled=!1,r.disabled=!0,d&&(d.textContent="Disconnected")}}),r.addEventListener("click",b),i.addEventListener("click",()=>{o.innerHTML=""}),t.querySelector("#log-container").addEventListener("change",()=>{s&&s.readyState===WebSocket.OPEN&&(b(),n.click())});let u=y.go.bind(y);y.go=function(p,v={}){return s&&b(),u(p,v)}}function Qe(t){switch(t){case"valid":return'<span class="kp-ssl-valid" uk-icon="icon: lock; ratio: 0.85" uk-tooltip="Valid SSL certificate"></span>';case"self-signed":return'<span class="kp-ssl-self-signed" uk-icon="icon: lock; ratio: 0.85" uk-tooltip="Self-signed certificate"></span>';case"expired":return'<span class="kp-ssl-none" uk-icon="icon: warning; ratio: 0.85" uk-tooltip="Expired certificate"></span>';case"mismatch":return'<span class="kp-ssl-none" uk-icon="icon: warning; ratio: 0.85" uk-tooltip="Certificate does not match this domain"></span>';default:return'<span class="kp-ssl-none" uk-icon="icon: warning; ratio: 0.85" uk-tooltip="No SSL certificate"></span>'}}async function ne(t,e){try{let s=await m.get(`/ssl-status?domain=${encodeURIComponent(t)}`),a=document.getElementById(`ssl-icon-${e}`);a&&(a.outerHTML=Qe(s.status))}catch{}}function oe(t){t.forEach(e=>ne(e.Domain,e.ID))}function ie(t,e,s,a=0,o=null){let n=t.SiteType!==3&&t.PMAPort>0;return`
        <div class="uk-grid-medium" uk-grid>
            <div class="uk-width-1-2@m">
                <div class="kp-card uk-padding-small">
                    <h3 class="kp-view-title uk-margin-bottom">Site Info</h3>
                    <table class="uk-table uk-table-small uk-table-divider uk-margin-remove">
                        <tbody>
                            <tr><td class="kp-muted">Name</td><td>${t.Name}</td></tr>
                            ${o?`<tr><td class="kp-muted">Parent</td><td><a href="javascript:void(0)" data-action="manage" data-id="${a}" style="color:var(--kp-cyan)">${o}</a></td></tr>`:""}
                            <tr><td class="kp-muted">Internal Port</td><td>:${t.Port}</td></tr>
                            <tr><td class="kp-muted">Type</td><td>${V(t.SiteType)}</td></tr>
                            <tr><td class="kp-muted">Version</td><td>${R(t)}</td></tr>
                            <tr><td class="kp-muted">Status</td><td>${H(t.SiteStatus)}</td></tr>
                            <tr><td class="kp-muted">Containers</td><td><div id="sd-health-badges" class="kp-health-badges"></div></td></tr>
                            <tr><td class="kp-muted">Created</td><td>${new Date(t.Created).toLocaleString()}</td></tr>
                        </tbody>
                    </table>
                </div>
                
                ${o?`
                <div class="kp-card uk-padding-small uk-margin-small-top">
                    <h3 class="kp-view-title uk-margin-bottom">Site Sync</h3>
                    <p class="kp-muted uk-text-small uk-margin-remove-bottom">
                        Sync files and database between this clone and its parent site.
                    </p>
                    <div class="uk-flex uk-margin-small-top" style="gap:8px">
                        <button class="uk-button kp-btn-secondary kp-btn-sm" id="sync-pull-btn">
                            <span uk-icon="cloud-download"></span> Pull From Parent
                        </button>
                        <button class="uk-button kp-btn-secondary kp-btn-sm" id="sync-push-btn">
                            <span uk-icon="cloud-upload"></span> Push To Parent
                        </button>
                    </div>
                </div>`:""}

                ${n?`
                <div class="kp-card uk-padding-small uk-margin-small-top">
                    <h3 class="kp-view-title uk-margin-bottom">phpMyAdmin</h3>
                    <p class="kp-muted uk-text-small uk-margin-remove-bottom">
                        Opens a secure time-limited session. Link expires after 10 minutes or first use.
                    </p>
                    <div class="uk-margin-small-top">
                        <button class="uk-button kp-btn-secondary kp-btn-sm" id="pma-open-btn">
                            <span uk-icon="database"></span> Open phpMyAdmin
                        </button>
                    </div>
                </div>`:""}
                
            </div>

            <div class="uk-width-1-2@m">

                <div class="kp-card uk-padding-small">
                    <div class="uk-flex uk-flex-between uk-flex-middle uk-margin-small-bottom">
                        <h3 class="kp-view-title uk-margin-bottom">Domains</h3>
                        <button class="uk-button kp-btn-secondary kp-btn-sm" id="domain-add-btn" uk-tooltip="Add a New Domain">
                            <span uk-icon="plus"></span>
                        </button>
                    </div>
                    <div id="domain-list">
                        ${e.length?e.map(le).join(""):'<p class="kp-muted uk-text-small">No domains configured</p>'}
                    </div>
                    <div id="domain-add-form" class="uk-hidden uk-margin-small-top">
                        <div class="uk-flex kp-domain-add-wrap">
                            <input class="uk-input kp-input kp-input-sm" id="domain-add-input" type="text" placeholder="example.com">
                            <button class="uk-button kp-btn-primary kp-btn-sm" id="domain-save-btn">Add</button>
                            <button class="uk-button kp-btn-ghost kp-btn-sm" id="domain-cancel-btn">Cancel</button>
                        </div>
                    </div>
                </div>

                <div class="kp-card uk-padding-small uk-margin-small-top">
                    <h3 class="kp-view-title uk-margin-bottom">SFTP Access</h3>
                    <table class="uk-table uk-table-small uk-table-divider uk-margin-remove">
                        <tbody>
                            <tr><td class="kp-muted">Host</td><td class="kp-mono">${location.hostname}</td></tr>
                            <tr><td class="kp-muted">Port</td><td class="kp-mono">2222</td></tr>
                            <tr><td class="kp-muted">User</td><td class="kp-mono">${s?.Username??t.Name}</td></tr>
                            <tr>
                                <td class="kp-muted">Password</td>
                                <td>
                                    <span id="sftp-pass-display" class="kp-mono kp-sftp-pass" data-revealed="0">\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022</span>
                                    <button class="uk-button kp-btn-secondary kp-btn-sm uk-margin-small-left" id="sftp-reveal-btn" uk-tooltip="Reveal the Password">
                                        <span uk-icon="icon: eye; ratio: 0.75"></span>
                                    </button>
                                    <button class="uk-button kp-btn-secondary kp-btn-sm uk-margin-small-left" id="sftp-copy-btn" uk-tooltip="Copy the Password">
                                        <span uk-icon="icon: copy; ratio: 0.75"></span>
                                    </button>
                                </td>
                            </tr>
                            <tr><td class="kp-muted">Path</td><td class="kp-mono">/html</td></tr>
                        </tbody>
                    </table>
                    <div class="uk-margin-small-top">
                        <button class="uk-button kp-btn-ghost kp-btn-sm" id="sftp-regen-btn">
                            <span uk-icon="refresh"></span> Regenerate Password
                        </button>
                    </div>
                </div>

            </div>
        </div>`}function le(t){return`<div class="uk-flex uk-flex-between uk-flex-middle kp-config-row" data-domain-id="${t.ID}">
        <div class="uk-flex uk-flex-middle kp-domain-row-inner">
            <span id="ssl-icon-${t.ID}" class="kp-ssl-pending" uk-icon="icon: more; ratio: 0.85"></span>
            <span class="uk-text-small kp-mono">${t.Domain}</span>
        </div>
        <button class="kp-config-del" data-action="delete-domain" data-did="${t.ID}" title="Remove">
            <span uk-icon="icon: close; ratio: 0.8"></span>
        </button>
    </div>`}function re(t,e){t.querySelector("#domain-add-btn")?.addEventListener("click",()=>{t.querySelector("#domain-add-form").classList.remove("uk-hidden")}),t.querySelector("#domain-cancel-btn")?.addEventListener("click",()=>{t.querySelector("#domain-add-form").classList.add("uk-hidden")}),t.querySelector("#domain-save-btn")?.addEventListener("click",async()=>{let s=t.querySelector("#domain-add-input").value.trim();if(s)try{let a=await m.post(`/sites/${e}/domains`,{domain:s});t.querySelector("#domain-list").insertAdjacentHTML("beforeend",le(a)),ne(a.Domain,a.ID),t.querySelector("#domain-add-form").classList.add("uk-hidden"),t.querySelector("#domain-add-input").value="",c.success("Domain added")}catch(a){c.error(a.message)}}),t.querySelector("#domain-list")?.addEventListener("click",async s=>{let a=s.target.closest('[data-action="delete-domain"]');if(!(!a||!await L("Remove Domain","Remove this domain from the site?")))try{await m.delete(`/sites/${e}/domains/${a.dataset.did}`),a.closest("[data-domain-id]").remove(),c.success("Domain removed")}catch(n){c.error(n.message)}})}function ce(t,e,s=null){t.querySelector("#sftp-regen-btn")?.addEventListener("click",async()=>{let n=t.querySelector("#sftp-regen-btn"),r=n.innerHTML;n.disabled=!0,n.innerHTML='<div uk-spinner="ratio: 0.5"></div>';try{let i=await m.post(`/sites/${e}/sftp-regen`),l=t.querySelector("#sftp-pass-display");if(l&&i?.password){l.textContent=i.password,l.dataset.revealed="1";let d=t.querySelector("#sftp-reveal-btn");d&&(d.innerHTML='<span uk-icon="icon: eye-slash; ratio: 0.75"></span>')}c.success("SFTP password regenerated"),y.go("site-detail",{id:String(e)})}catch(i){c.error(i.message),n.disabled=!1,n.innerHTML=r}});let a=async()=>(await m.get(`/sites/${e}/sftp-password`))?.password??"",o=n=>{if(navigator.clipboard)navigator.clipboard.writeText(n).then(()=>c.success("Password copied to clipboard")).catch(()=>c.error("Failed to copy password"));else{let r=document.createElement("textarea");r.value=n,r.style.cssText="position:fixed;opacity:0",document.body.appendChild(r),r.select(),document.execCommand("copy"),document.body.removeChild(r),c.success("Password copied to clipboard")}};t.querySelector("#sftp-reveal-btn")?.addEventListener("click",async()=>{let n=t.querySelector("#sftp-pass-display"),r=t.querySelector("#sftp-reveal-btn");if(!n)return;if(n.dataset.revealed==="1"){n.textContent="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022",n.dataset.revealed="0",r.innerHTML='<span uk-icon="icon: eye; ratio: 0.75"></span>';return}let i=r.innerHTML;r.disabled=!0,r.innerHTML='<div uk-spinner="ratio: 0.5"></div>';try{n.textContent=await a(),n.dataset.revealed="1",r.innerHTML='<span uk-icon="icon: eye-slash; ratio: 0.75"></span>'}catch(l){c.error(l.message),r.innerHTML=i}finally{r.disabled=!1}}),t.querySelector("#sftp-copy-btn")?.addEventListener("click",async()=>{let n=t.querySelector("#sftp-copy-btn"),r=n.innerHTML;n.disabled=!0,n.innerHTML='<div uk-spinner="ratio: 0.5"></div>';try{let i=await a();i&&o(i)}catch(i){c.error(i.message)}finally{n.disabled=!1,n.innerHTML=r}}),t.querySelector("#pma-open-btn")?.addEventListener("click",async()=>{let n=t.querySelector("#pma-open-btn"),r=n.innerHTML;n.disabled=!0,n.innerHTML='<div uk-spinner="ratio: 0.5"></div> Opening...';try{let i=await m.post(`/sites/${e}/pma-token`);window.open(i.url,"_blank")}catch(i){c.error(i.message)}finally{n.disabled=!1,n.innerHTML=r}}),t.querySelector("#sync-pull-btn")?.addEventListener("click",async()=>{if(await mt("pull",s.Name,t.querySelector('[data-action="manage"][data-id="'+s.ParentID+'"]')?.textContent?.trim()??"parent"))try{c.success("Pull from parent complete")}catch(r){c.error(r.message)}}),t.querySelector("#sync-push-btn")?.addEventListener("click",async()=>{if(await mt("push",s.Name,t.querySelector('[data-action="manage"][data-id="'+s.ParentID+'"]')?.textContent?.trim()??"parent"))try{c.success("Push to parent complete")}catch(r){c.error(r.message)}})}function de(){return`
        <div class="kp-card uk-padding uk-margin-top">
            <h3 class="kp-view-title uk-margin-bottom">Redirects</h3>
            <p class="kp-muted uk-text-small uk-margin-small-bottom">
                Rules are evaluated in order. The first matching source wins.
                Source is a path (e.g. <code>/old-page</code>) or a regular expression (e.g. <code>^/blog/(d+)$</code>). Target is a full URL or path.
            </p>
            <div id="redirects-list" class="uk-margin-small-bottom"></div>
            <div class="uk-flex uk-flex-middle uk-margin-small-top" style="gap:8px">
                <button type="button" class="uk-button kp-btn-ghost uk-button-small" id="redirect-add-btn">
                    <span uk-icon="plus"></span> Add Rule
                </button>
            </div>
            <div class="uk-flex uk-flex-right uk-margin-top" style="gap:8px">
                <button type="button" class="uk-button kp-btn-primary" id="redirect-save-btn">
                    <span uk-icon="check"></span> Save
                </button>
            </div>
        </div>`}function ue(t="",e="",s=301){return`
        <div class="redirect-row uk-flex uk-flex-middle uk-margin-small-bottom" style="gap:8px">
            <input class="uk-input kp-input redirect-source" type="text" placeholder="/old-path" value="${t}" style="flex:1">
            <input class="uk-input kp-input redirect-target" type="text" placeholder="https://example.com/new-path" value="${e}" style="flex:2">
            <select class="uk-select kp-select redirect-code" style="width:90px">
                <option value="301" ${s===301?"selected":""}>301</option>
                <option value="302" ${s===302?"selected":""}>302</option>
                <option value="307" ${s===307?"selected":""}>307</option>
                <option value="308" ${s===308?"selected":""}>308</option>
            </select>
            <a href="javascript:void(0);" class="kp-muted redirect-remove-btn" uk-icon="trash"></a>
        </div>`}async function pe(t){let e=document.getElementById("redirects-list");if(!e)return;e.innerHTML="";let s=await m.get(`/sites/${t}/redirects`);e.innerHTML=s.map(a=>ue(a.Source,a.Target,a.Code)).join("")}function me(t,e){let s=new AbortController,a={signal:s.signal};t.addEventListener("click",o=>{o.target.closest("#redirect-add-btn")&&document.getElementById("redirects-list").insertAdjacentHTML("beforeend",ue()),o.target.closest(".redirect-remove-btn")&&o.target.closest(".redirect-row").remove()},a),t.addEventListener("click",async o=>{if(!o.target.closest("#redirect-save-btn"))return;let n=[...document.querySelectorAll(".redirect-row")].map(r=>({Source:r.querySelector(".redirect-source").value.trim(),Target:r.querySelector(".redirect-target").value.trim(),Code:parseInt(r.querySelector(".redirect-code").value,10)}));try{await m.put(`/sites/${e}/redirects`,n),c.success("Redirects saved")}catch(r){c.error(r.message||"Failed to save redirects")}},a),t.__redirectsAbort?.abort(),t.__redirectsAbort=s}function Ye(){return`
        <div class="kp-card uk-padding uk-margin-top">
            <h3 class="kp-view-title uk-margin-bottom">WAF Override</h3>
            <form id="waf-override-form" class="uk-form-stacked">
                <div class="uk-margin">
                    <label class="kp-label" for="waf-override">Site Behaviour</label>
                    <select class="uk-select kp-select" id="waf-override" name="override">
                        <option value="0">Inherit global setting</option>
                        <option value="1">Force ON for this site</option>
                        <option value="2">Force OFF for this site</option>
                    </select>
                </div>
                <div class="uk-margin">
                    <label class="kp-label">CRS Plugins</label>
                    <p class="kp-muted uk-text-small uk-margin-small-top">
                        Select OWASP CRS plugins to enable for this site. Only plugins present in the
                        local CRS install are shown. Changes recompile the site WAF engine in the background.
                    </p>
                    <div id="waf-plugins-list" class="uk-margin-small-top">
                        <span class="kp-muted uk-text-small">Loading available plugins\u2026</span>
                    </div>
                </div>
                <div class="uk-margin">
                    <label class="kp-label" for="waf-site-exclusions">Additional Rule Exclusions</label>
                    <textarea
                        class="uk-textarea kp-input kp-mono kp-waf-exclusions"
                        id="waf-site-exclusions"
                        name="exclusions"
                        rows="15"
                        placeholder="# Numeric = rule ID, text = tag name, one per line&#10;942100&#10;attack-xss"></textarea>
                    <p class="kp-muted uk-text-small uk-margin-small-top">
                        Merged on top of global exclusions. Useful for WooCommerce, contact forms, or file upload paths that trigger false positives.
                    </p>
                </div>
                <div class="uk-flex uk-flex-right uk-margin-top" style="gap:8px">
                    <a class="uk-button kp-btn-ghost" id="waf-export-btn" href="#" uk-tooltip="Export WAF settings">
                        <span uk-icon="download"></span>
                    </a>
                    <label class="uk-button kp-btn-ghost" style="cursor:pointer" uk-tooltip="Import WAF settings">
                        <span uk-icon="upload"></span>
                        <input type="file" id="waf-import" accept=".json" style="display:none">
                    </label>
                    <button type="submit" class="uk-button kp-btn-primary">
                        <span uk-icon="check"></span> Save
                    </button>
                </div>
            </form>
        </div>`}async function St(t){let e=document.getElementById("waf-tab-panel");if(!e)return;e.innerHTML=Ye();let s=document.getElementById("waf-export-btn");s&&(s.href=`/api/sites/${t}/waf/export`);try{let a=await m.get(`/sites/${t}/waf`),o=document.getElementById("waf-override"),n=document.getElementById("waf-site-exclusions");o&&(o.value=String(a.Override??0)),n&&(n.value=a.Exclusions??"");let r=document.getElementById("waf-plugins-list");if(r){let[i,l]=await Promise.all([m.get("/settings/waf/plugins"),m.get(`/sites/${t}/waf/plugins`)]),d=new Set(l??[]);!i||i.length===0?r.innerHTML='<span class="kp-muted uk-text-small">No plugins found in local CRS install.</span>':window.matchMedia("(max-width: 959px)").matches?r.innerHTML=`
                    <select multiple class="uk-select kp-select waf-plugin-select" size="${Math.min(i.length,8)}">
                        ${i.map(k=>`
                        <option value="${k}" ${d.has(k)?"selected":""}>${k}</option>
                        `).join("")}
                    </select>`:(r.innerHTML=`
                    <div class="waf-plugin-pills">
                        ${i.map(k=>`
                        <span class="waf-plugin-pill ${d.has(k)?"active":""}"
                            data-plugin="${k}">${k}</span>
                        `).join("")}
                    </div>`,r.querySelectorAll(".waf-plugin-pill").forEach(k=>{k.addEventListener("click",()=>k.classList.toggle("active"))}))}}catch(a){c.error("Failed to load WAF settings: "+a.message)}}function ke(t,e,s){t.addEventListener("submit",async a=>{if(a.target.id!=="waf-override-form")return;a.preventDefault();let o=a.target.querySelector('[type="submit"]'),n=o.innerHTML;o.disabled=!0,o.innerHTML='<div uk-spinner="ratio: 0.6"></div> Saving...';let r=new FormData(a.target),i={override:parseInt(r.get("override"),10),exclusions:r.get("exclusions").trim()};try{await m.put(`/sites/${e}/waf`,i);let l=document.querySelector(".waf-plugin-select"),d=l?[...l.selectedOptions].map(k=>k.value):[...document.querySelectorAll(".waf-plugin-pill.active")].map(k=>k.dataset.plugin);await m.put(`/sites/${e}/waf/plugins`,d),c.success("WAF override saved \u2014 engine recompiling in background")}catch(l){c.error(l.message)}finally{o.disabled=!1,o.innerHTML=n}},{signal:s}),t.querySelector("#waf-import")?.addEventListener("change",async a=>{let o=a.target.files[0];if(!o)return;let n=new FormData;n.append("file",o);try{let r=await fetch(`/api/sites/${e}/waf/import`,{method:"POST",headers:{"X-CSRF-Token":window.KP?.csrf??""},body:n}),i=r.status===204?null:await r.json().catch(()=>null);if(!r.ok)throw new Error(i?.error||`HTTP ${r.status}`);await St(e),c.success("WAF settings imported")}catch(r){c.error(r.message)}finally{a.target.value=""}})}var Ze=[{label:"Cache Flush",cmd:"cache flush"},{label:"Plugin List",cmd:"plugin list"},{label:"Theme List",cmd:"theme list"},{label:"User List",cmd:"user list"},{label:"Core Check",cmd:"core check-update"},{label:"Core Update",cmd:"core update"},{label:"Plugin Updates",cmd:"plugin update --all"},{label:"Theme Updates",cmd:"theme update --all"},{label:"Rewrite Flush",cmd:"rewrite flush"},{label:"Transient Delete",cmd:"transient delete --all"},{label:"Search Replace",cmd:"search-replace '' ''"}];function be(t){return`
        <div class="kp-wpcli">
            <div class="kp-log-controls" style="flex-wrap:wrap;gap:6px">
                ${Ze.map(e=>`
                   <button class="uk-button kp-btn-ghost kp-btn-sm"
                        data-action="wpcli-quick"
                        data-cmd="${e.cmd}">
                        ${e.label}
                    </button>`).join("")}
            </div>
            
            <p class="kp-muted uk-text-small uk-margin-small-top">
                <span uk-icon="icon: info; ratio: 0.75"></span>
                WP-CLI <span class="kp-mono">db</span> subcommands are not available for security.
            </p>

            <div class="uk-flex uk-flex-middle uk-margin-small-top" style="gap:8px">
                <span class="kp-mono" style="color:var(--kp-cyan);font-size:0.85rem;flex-shrink:0">wp&gt;</span>
                <input
                    class="uk-input kp-input"
                    id="wpcli-input"
                    type="text"
                    placeholder="plugin list --status=active"
                    style="height:38px;font-family:'JetBrains Mono',monospace;font-size:0.85rem"
                    autocomplete="off"
                    spellcheck="false">
                <button class="uk-button kp-btn-primary kp-btn-sm" id="wpcli-run">
                    <span uk-icon="play"></span> Run
                </button>
                <button class="uk-button kp-btn-ghost kp-btn-sm" id="wpcli-clear">
                    <span uk-icon="trash"></span> Clear
                </button>
            </div>

            <div class="kp-log-header uk-margin-small-top">
                <div class="kp-log-dot kp-log-dot-red"></div>
                <div class="kp-log-dot kp-log-dot-yellow"></div>
                <div class="kp-log-dot kp-log-dot-green"></div>
                <span style="font-size:0.72rem;color:var(--kp-text-dim);margin-left:8px" id="wpcli-status">Ready</span>
            </div>
            <div class="kp-log-wrap" id="wpcli-output" style="height:500px"></div>
        </div>`}function ve(t,e){let s=t.querySelector("#wpcli-output"),a=t.querySelector("#wpcli-input"),o=t.querySelector("#wpcli-run"),n=t.querySelector("#wpcli-clear"),r=t.querySelector("#wpcli-status"),i=[],l=-1;function d(u,p=""){u.split(`
`).forEach(v=>{if(!v)return;let h=document.createElement("div");p?h.className=p:h.className=v.match(/error|fatal|critical/i)?"kp-log-line-err":v.match(/warning|warn/i)?"kp-log-line-warn":v.match(/success|done\]/i)?"kp-log-line-info":"",h.textContent=v,s.appendChild(h)}),s.scrollTop=s.scrollHeight}function k(u){if(u=u.trim(),!u)return;i.unshift(u),l=-1,d(`wp> ${u}`,"kp-log-line-info"),a.disabled=!0,o.disabled=!0,r&&(r.textContent="Running...");let p=location.protocol==="https:"?"wss":"ws",v=new WebSocket(`${p}://${location.host}/api/sites/${e}/wpcli`);v.onopen=()=>{v.send(JSON.stringify({command:u}))},v.onmessage=h=>{let f=h.data;if(f.trim()==="[done]"){v.close();return}if(f.startsWith("[info]")){d(f,"kp-muted");return}if(f.startsWith("[error]")){d(f,"kp-log-line-err");return}d(f)},v.onerror=()=>{d("[error] WebSocket connection failed","kp-log-line-err")},v.onclose=()=>{a.disabled=!1,o.disabled=!1,r&&(r.textContent="Ready"),a.focus()}}o.addEventListener("click",()=>{k(a.value),a.value=""}),a.addEventListener("keydown",u=>{if(u.key==="Enter"){k(a.value),a.value="",l=-1;return}if(u.key==="ArrowUp"){u.preventDefault(),l<i.length-1&&(l++,a.value=i[l]);return}u.key==="ArrowDown"&&(u.preventDefault(),l>0?(l--,a.value=i[l]):(l=-1,a.value=""))}),t.querySelectorAll('[data-action="wpcli-quick"]').forEach(u=>{u.addEventListener("click",()=>{let p=u.dataset.cmd;if(p.startsWith("search-replace")){a.value=p,a.focus();let v=p.indexOf("''")+1;a.setSelectionRange(v,v);return}k(p)})}),n.addEventListener("click",()=>{s.innerHTML=""});let b=y.go.bind(y);y.go=function(u,p={}){return b(u,p)},a.focus()}var z=null,A=null;function he(t){let e=t.querySelector("#kp-site-pills"),s=t.querySelector("#kp-site-switcher"),a=t.querySelector("#kp-manage-pill"),o=t.querySelector("#kp-manage-dropdown");if(!e||!s)return;function n(i,l=!1){UIkit.switcher(s).show(i),e.querySelectorAll(":scope > li[data-pill]").forEach(d=>d.classList.remove("kp-pill-active")),l?(a?.classList.add("kp-pill-active"),o?.querySelectorAll("a[data-switcher]").forEach(d=>{d.classList.toggle("kp-dd-active",parseInt(d.dataset.switcher,10)===i)})):(a?.classList.remove("kp-pill-active"),o?.querySelectorAll("a[data-switcher]").forEach(d=>d.classList.remove("kp-dd-active")))}e.querySelectorAll(":scope > li[data-pill] > a").forEach(i=>{i.addEventListener("click",l=>{l.preventDefault();let d=parseInt(i.closest("li").dataset.pill,10);n(d,!1)})}),a?.querySelector(".kp-pill-dropdown-btn")?.addEventListener("click",i=>{i.stopPropagation(),o.hidden=!o.hidden,a.classList.toggle("kp-pill-active",!o.hidden)}),o?.querySelectorAll("a[data-switcher]").forEach(i=>{i.addEventListener("click",l=>{l.preventDefault(),o.hidden=!0,n(parseInt(i.dataset.switcher,10),!0)})}),document.addEventListener("click",i=>{o&&!a.contains(i.target)&&(o.hidden=!0)},{capture:!0}),UIkit.switcher(s).show(1)}function ts(){return`
        <div class="kp-card uk-padding uk-margin-top">
            <h3 class="kp-view-title uk-margin-bottom">Upstream Routes</h3>
            <p class="kp-muted uk-text-small uk-margin-bottom">
                Each domain maps to one or more upstream URLs. Multiple upstreams for the same
                domain are load-balanced via round-robin.
            </p>
            <div id="rp-routes-list"></div>
            <button class="uk-button kp-btn-ghost uk-margin-small-top" id="rp-add-row">
                <span uk-icon="plus"></span> Add Route
            </button>
            <div class="uk-flex uk-flex-right uk-margin-top">
                <button class="uk-button kp-btn-primary" id="rp-save-btn">
                    <span uk-icon="check"></span> Save Routes
                </button>
            </div>
        </div>`}function $t(t="",e="",s=!1){return`
        <div class="rp-route-row uk-flex uk-flex-middle uk-margin-small-bottom" style="gap:8px">
            <span>Host:</span><input class="uk-input kp-input" style="flex:1" placeholder="example.com" value="${t}" data-field="domain">
            <span>Upstream:</span><input class="uk-input kp-input" style="flex:2" placeholder="https://10.0.0.1:8080" value="${e}" data-field="upstream">
            <label style="white-space:nowrap;font-size:0.75rem;color:var(--kp-text-dim)" title="Send incoming domain as Host header instead of upstream hostname">
                <input type="checkbox" class="uk-checkbox" data-field="pass_host" ${s?"checked":""}> Pass Host
            </label>
            <button class="uk-button kp-btn-ghost kp-btn-sm rp-remove-row" uk-tooltip="Remove"><span uk-icon="trash"></span></button>
        </div>`}async function es(t){let e=document.getElementById("rp-routes-list");if(e)try{let s=await m.get(`/sites/${t}/rp-routes`);e.innerHTML=s.length?s.map(a=>$t(a.Domain,a.Upstream,a.PassHost)).join(""):$t()}catch(s){c.error("Failed to load routes: "+s.message)}}function ss(t,e){t.addEventListener("click",async s=>{if(s.target.closest("#rp-add-row")){document.getElementById("rp-routes-list").insertAdjacentHTML("beforeend",$t());return}if(s.target.closest(".rp-remove-row")){s.target.closest(".rp-route-row").remove();return}if(!s.target.closest("#rp-save-btn"))return;let a=s.target.closest("#rp-save-btn"),o=a.innerHTML;a.disabled=!0,a.innerHTML='<div uk-spinner="ratio: 0.6"></div> Saving...';let n=[...document.querySelectorAll(".rp-route-row")].map(r=>({Domain:r.querySelector('[data-field="domain"]').value.trim(),Upstream:r.querySelector('[data-field="upstream"]').value.trim(),PassHost:r.querySelector('[data-field="pass_host"]').checked})).filter(r=>r.Domain&&r.Upstream);try{await m.put(`/sites/${e}/rp-routes`,n),c.success("Routes saved")}catch(r){c.error(r.message)}finally{a.disabled=!1,a.innerHTML=o}},{signal:z.signal})}function as(t){return t.endsWith("-nginx")?"world":t.endsWith("-php")?"code":t.endsWith("-db")?"database":t.endsWith("-redis")?"server":t.endsWith("-varnish")?"grid":t.endsWith("-pma")?"table":t.endsWith("-app")?"laptop":"bolt"}function ge(t){let e=t.split("-").pop();return{nginx:"Nginx",php:"PHP-FPM",db:"MariaDB",redis:"Redis",varnish:"Varnish",pma:"phpMyAdmin",app:"App"}[e]??e}function Et(t){switch(t){case"healthy":return"var(--kp-success)";case"unhealthy":return"var(--kp-danger)";case"starting":return"var(--kp-warning)";default:return"var(--kp-text-dim)"}}function ns(t){return!t||!t.length?"":t.filter(e=>!e.name.endsWith("-infra")).map(e=>`
            <span class="kp-health-badge"
                data-container="${g(e.name)}"
                title="Restart the Container"
                style="cursor:pointer;color:${Et(e.status)}">
                <span uk-icon="icon: ${as(e.name)}; ratio: 1.1"></span>
                <span class="kp-health-badge-label">${g(ge(e.name))}</span>
            </span>
        `).join("")}function os(t,e){A&&(A.close(),A=null);let s=document.getElementById("sd-health-badges");if(!s)return;let a=location.protocol==="https:"?"wss":"ws";A=new WebSocket(`${a}://${location.host}/api/sites/${e}/health/stream`),A.onmessage=o=>{try{let n=JSON.parse(o.data);s.innerHTML=ns(n),s.querySelectorAll(".kp-health-badge").forEach(r=>{r.addEventListener("click",async()=>{r.style.color=Et("starting");let i=r.dataset.container,l=i.split("-").pop();try{await m.post(`/sites/${e}/containers/${l}/restart`),c.success(`${ge(i)} restarted`)}catch(d){r.style.color=Et("none"),c.error(d.message)}})})}catch{}},A.onerror=()=>{},A.onclose=()=>{A=null}}async function fe(t,{id:e}){let[{site:s,domains:a,sftp:o},n,r]=await Promise.all([m.get(`/sites/${e}`),m.get("/sites"),m.get(`/sites/${e}/configs`)]),i=Array.isArray(n)?n:[],l=s.SiteType===1||s.SiteType===2,d=s.SiteType===6,k=[1,2,4,5].includes(s.SiteType);if(z&&z.abort(),z=new AbortController,t.innerHTML=`
        <div class="kp-view-header">
            <div class="uk-flex uk-flex-middle" style="gap:12px">
                <button class="kp-btn-icon" id="sd-back"><span uk-icon="arrow-left"></span></button>
                <div class="kp-site-nav-wrap">
                    <select id="sd-site-nav" class="uk-select kp-select">
                        ${i.map(p=>`<option value="${p.ID}" ${p.ID===s.ID?"selected":""}>${p.Name}</option>`).join("")}
                    </select>
                    <span class="kp-site-nav-arrow">&#9660;</span>
                </div>
                ${d?"":H(s.SiteStatus)}
            </div>
            <div class="uk-flex" style="gap:8px;flex-wrap:wrap">
                ${d?"":`
                ${s.SiteStatus===1?`<button class="uk-button kp-btn-ghost kp-btn-sm" data-action="stop" data-id="${e}" uk-tooltip="Stop the Site"><span uk-icon="ban"></span></button>`:`<button class="uk-button kp-btn-ghost kp-btn-sm" data-action="start" data-id="${e}" uk-tooltip="Start the Site"><span uk-icon="play"></span></button>`}
                <button class="uk-button kp-btn-ghost kp-btn-sm" data-action="restart" data-id="${e}" uk-tooltip="Restart the Site"><span uk-icon="refresh"></span></button>
                <button class="uk-button kp-btn-ghost kp-btn-sm" data-action="flush" data-id="${e}" uk-tooltip="Flush the Caches"><span uk-icon="bolt"></span></button>
                <button class="uk-button kp-btn-ghost kp-btn-sm kp-btn-recreate" id="sd-recreate" uk-tooltip="Recreate &amp; Update the Pod"><span uk-icon="history"></span></button>
                <button class="uk-button kp-btn-ghost kp-btn-sm" id="sd-clone" uk-tooltip="Clone the Site"><span uk-icon="move"></span></button>
                `}
                <button class="uk-button kp-btn-ghost kp-btn-sm" id="sd-rename" uk-tooltip="Rename the Site"><span uk-icon="tag"></span></button>
                <button class="uk-button kp-btn-ghost kp-btn-sm" id="sd-edit" uk-tooltip="Edit the Site"><span uk-icon="pencil"></span></button>
            </div>
        </div>
 
        ${d?`
        <!-- tab pills (reverse proxy) -->
        <ul class="kp-tab-pills" id="kp-site-pills">
            <li data-pill="0"><a href="#">Routes</a></li>
            <li id="kp-manage-pill">
                <a href="javascript:void(0);" class="kp-pill-dropdown-btn">
                    Manage <span uk-icon="icon: chevron-down; ratio: 0.8"></span>
                </a>
                <div class="kp-pill-dropdown" id="kp-manage-dropdown" hidden>
                    <div class="kp-pill-dropdown-section">Security</div>
                    <a href="#" data-switcher="3"><span uk-icon="icon: lock; ratio: 0.85"></span> Security</a>
                    <a href="#" data-switcher="4"><span uk-icon="icon: lifesaver; ratio: 0.85"></span> WAF</a>
                    <a href="#" data-switcher="5"><span uk-icon="icon: user; ratio: 0.85"></span> Basic Auth</a>
                </div>
            </li>
            <li data-pill="1"><a href="#">Stats</a></li>
            <li data-pill="2"><a href="#">Logs</a></li>
        </ul>

        <!-- switcher panels -->
        <ul class="uk-switcher" id="kp-site-switcher">
            <li>${ts()}</li>
            <li>${bt(e,s.SiteType)}</li>
            <li>${xt(e,s.SiteType)}</li>
            <li>${K(e)}</li>
            <li id="waf-tab-panel"></li>
            <li>${ft()}</li>
        </ul>
        `:`
        <!-- tab pills -->
        <ul class="kp-tab-pills" id="kp-site-pills">
            <li data-pill="0"><a href="#">Overview</a></li>
            <li id="kp-manage-pill">
                <a href="javascript:void(0);" class="kp-pill-dropdown-btn">
                    Manage <span uk-icon="icon: chevron-down; ratio: 0.8"></span>
                </a>
                <div class="kp-pill-dropdown" id="kp-manage-dropdown" hidden>
                    <div class="kp-pill-dropdown-section">Config</div>
                    <a href="#" data-switcher="2"><span uk-icon="icon: settings; ratio: 0.85"></span> Nginx</a>
                    ${l?'<a href="#" data-switcher="3"><span uk-icon="icon: code; ratio: 0.85"></span> PHP</a>':""}
                    <a href="#" data-switcher="${l?4:3}"><span uk-icon="icon: database; ratio: 0.85"></span> MariaDB</a>
                    <a href="#" data-switcher="${l?5:4}"><span uk-icon="icon: server; ratio: 0.85"></span> Redis</a>
                    <a href="#" data-switcher="${l?6:5}"><span uk-icon="icon: world; ratio: 0.85"></span> Varnish</a>
                    <hr>
                    <div class="kp-pill-dropdown-section">Security</div>
                    <a href="#" data-switcher="${l?8:7}"><span uk-icon="icon: lock; ratio: 0.85"></span> Security</a>
                    <a href="#" data-switcher="${l?9:8}"><span uk-icon="icon: lifesaver; ratio: 0.85"></span> WAF</a>
                    <a href="#" data-switcher="${l?10:9}"><span uk-icon="icon: user; ratio: 0.85"></span> Basic Auth</a>
                    <hr>
                    <div class="kp-pill-dropdown-section">Tools</div>
                    ${s.SiteType===1?`<a href="#" data-switcher="${l?11:10}"><span uk-icon="icon: file-text; ratio: 0.85"></span> WP-CLI</a>`:""}
                    <a href="#" data-switcher="${s.SiteType===1?l?12:11:l?11:10}"><span uk-icon="icon: history; ratio: 0.85"></span> Backups</a>
                    ${k?`<a href="#" data-switcher="${s.SiteType===1?l?13:12:l?12:11}"><span uk-icon="icon: clock; ratio: 0.85"></span> Crons</a>`:""}
                    <a href="#" data-switcher="${s.SiteType===1?l?14:13:l?13:12}"><span uk-icon="icon: forward; ratio: 0.85"></span> Redirects</a>
                    <a href="#" data-switcher="files"><span uk-icon="icon: folder; ratio: 0.85"></span> Files</a>
                </div>
            </li>
            <li data-pill="1"><a href="#">Stats</a></li>
            <li data-pill="${l?7:6}"><a href="#">Logs</a></li>
        </ul>

        <!-- switcher panels (driven by pills above) -->
        <ul class="uk-switcher" id="kp-site-switcher">
            <li>${ie(s,a??[],o,s.ParentID??0,i.find(p=>p.ID===s.ParentID)?.Name??null)}</li>
            <li>${bt(e,s.SiteType)}</li>
            <li>${Q(e,1,r[1])}</li>
            ${l?`<li>${Q(e,2,r[2])}</li>`:""}
            <li>${Q(e,3,r[3])}</li>
            <li>${Q(e,4,r[4])}</li>
            <li>${zt(e,r[5])}</li>
            <li>${xt(e,s.SiteType)}</li>
            <li>${K(e)}</li>
            <li id="waf-tab-panel"></li>
            <li>${ft()}</li>
            ${s.SiteType===1?`<li>${be(e)}</li>`:""}
            <li>${jt(e)}</li>
            ${k?`<li>${Jt(e)}</li>`:""}
            <li>${de()}</li>
            <li>${ee(e)}</li>
        </ul>`}`,document.getElementById("sd-back").addEventListener("click",()=>y.go("sites")),document.getElementById("sd-edit").addEventListener("click",()=>Nt(s)),document.getElementById("sd-rename").addEventListener("click",async()=>{let p=await _t(s.Name);if(!(!p||p===s.Name)){$("Renaming Site","Moving the database, files, and pod \u2014 this may take a few minutes...");try{await m.post(`/sites/${e}/rename`,{name:p},18e5),x(),c.success(`Site renamed to '${p}'`),y.go("site-detail",{id:e})}catch(v){x(),c.error(v.message)}}}),document.getElementById("sd-site-nav")?.addEventListener("change",p=>{y.go("site-detail",{id:p.target.value})}),lt(t),M(t),ae(t,e),ke(t,e,z.signal),St(e),d){ss(t,e),es(e),ht(t,e,s.SiteType),gt(e,s.SiteType),yt(t,e),J(e),he(t);return}document.getElementById("sd-recreate").addEventListener("click",async()=>{$("Recreating Pod","Recreating containers for this site...");try{await m.post(`/sites/${e}/recreate`),x(),c.success("Pod recreated"),y.go("site-detail",{id:e})}catch(p){x(),c.error(p.message)}}),document.getElementById("sd-clone")?.addEventListener("click",async()=>{let p=await Tt(s.Name);if(p){$("Cloning Site","Copying files and database \u2014 this may take a few minutes...");try{await m.post(`/sites/${e}/clone`,{name:p},6e5),x(),c.success(`Site cloned as '${p}'`),y.go("sites")}catch(v){x(),c.error(v.message)}}}),Vt(t,e,z.signal),re(t,e),s.SiteType===1&&ve(t,e),ce(t,e,s),Ot(t,e),j(t,e),k&&(Gt(t,e),rt(t,e)),me(t,e),pe(e);let b=t.querySelector("#kp-site-switcher"),u=t.querySelector('a[data-switcher="files"]');b&&u&&(u.dataset.switcher=String(b.children.length-1)),se(t,e),C(e),os(t,e),ht(t,e,s.SiteType),gt(e,s.SiteType),he(t),yt(t,e),J(e),oe(a??[])}async function dt(t){let e=document.getElementById("totp-qr-img"),s=document.getElementById("totp-qr-wrap");if(!e||!s)return;if(s.querySelectorAll(".totp-uri-text").forEach(o=>o.remove()),typeof QRCode<"u")try{let o=await new Promise((n,r)=>{QRCode.toDataURL(t,{width:220,margin:2},(i,l)=>{i?r(i):n(l)})});e.src=o,e.style.display="";return}catch{}let a=document.createElement("p");a.className="totp-uri-text kp-muted uk-text-small",a.style.wordBreak="break-all",a.textContent=t,s.appendChild(a)}function ut(t){document.getElementById("kp-backup-codes-modal")?.remove();let s=`
        <div id="kp-backup-codes-modal" uk-modal="bg-close:false;esc-close:false">
            <div class="uk-modal-dialog kp-modal uk-modal-body" style="max-width:480px">
                <h3 class="uk-modal-title" style="color:var(--kp-yellow,#f0b429)">
                    <span uk-icon="warning"></span>&nbsp;Save Your Backup Codes
                </h3>
                <p class="kp-muted uk-text-small uk-margin-small-bottom">
                    These codes let you access your account if you lose your authenticator.
                    Each code works <strong>once only</strong>. Keep them somewhere safe.
                </p>
                <div class="kp-backup-codes-grid uk-margin-small">${t.map(o=>`<code class="kp-backup-code">${o}</code>`).join("")}</div>
                <p class="kp-muted uk-text-small uk-margin-small-top">
                    These codes will <strong>not</strong> be shown again.
                </p>
                <div class="uk-flex uk-flex-right uk-margin-top" style="gap:8px">
                    <button id="kp-backup-copy-btn" class="uk-button kp-btn-ghost">Copy All</button>
                    <button id="kp-backup-done-btn" class="uk-button kp-btn-primary">I've Saved These</button>
                </div>
            </div>
        </div>`;document.body.insertAdjacentHTML("beforeend",s);let a=UIkit.modal("#kp-backup-codes-modal");a.show(),document.getElementById("kp-backup-copy-btn").addEventListener("click",()=>{let o=t.join(`
`),n=document.getElementById("kp-backup-copy-btn");if(navigator.clipboard)navigator.clipboard.writeText(o).then(()=>{n.textContent="Copied!"});else{let r=document.createElement("textarea");r.value=o,r.style.cssText="position:fixed;opacity:0",document.body.appendChild(r),r.select();try{document.execCommand("copy"),n.textContent="Copied!"}catch{}r.remove()}}),document.getElementById("kp-backup-done-btn").addEventListener("click",()=>{a.hide(),document.getElementById("kp-backup-codes-modal")?.remove(),y.go("users")})}function ye(t){document.body.insertAdjacentHTML("beforeend",`
        <div id="kp-create-user-modal" uk-modal>
            <div class="uk-modal-dialog kp-modal uk-modal-body uk-width-large">
                <button class="uk-modal-close-default" type="button" uk-close></button>
                <h3 class="kp-view-title">New User</h3>
                <form id="create-user-form" class="uk-form-stacked uk-margin-top">
                    <div class="uk-grid-small" uk-grid>
                        <div class="uk-width-1-2@s">
                            <label class="kp-label">First Name</label>
                            <input class="uk-input kp-input" name="fname" type="text" required>
                        </div>
                        <div class="uk-width-1-2@s">
                            <label class="kp-label">Last Name</label>
                            <input class="uk-input kp-input" name="lname" type="text" required>
                        </div>
                        <div class="uk-width-1-1">
                            <label class="kp-label">Username</label>
                            <input class="uk-input kp-input" name="uname" type="text" required>
                        </div>
                        <div class="uk-width-1-2@s">
                            <label class="kp-label">Email</label>
                            <input class="uk-input kp-input" name="email" type="email" required>
                        </div>
                        <div class="uk-width-1-2@s">
                            <label class="kp-label">Phone</label>
                            <input class="uk-input kp-input" name="phone" type="tel" required>
                        </div>
                        <div class="uk-width-1-1">
                            <label class="kp-label uk-margin-small-bottom">Notifications</label>
                            <div class="uk-flex" style="gap:24px">
                                <label><input class="uk-checkbox" type="checkbox" name="notify_email"> &nbsp;Email</label>
                                <label><input class="uk-checkbox" type="checkbox" name="notify_sms"> &nbsp;SMS</label>
                            </div>
                        </div>
                        <div class="uk-width-1-2@s">
                            <label class="kp-label">Password</label>
                            <input class="uk-input kp-input" name="password" type="password" required>
                        </div>
                        <div class="uk-width-1-2@s">
                            <label class="kp-label">Role</label>
                            <select class="uk-select kp-select" name="role">
                                <option value="50">Manager</option>
                                <option value="99">Admin</option>
                            </select>
                        </div>
                    </div>
                    <div class="uk-flex uk-flex-right uk-margin-top" style="gap:8px">
                        <button type="button" class="uk-button kp-btn-ghost uk-modal-close">Cancel</button>
                        <button type="submit" class="uk-button kp-btn-primary">Create User</button>
                    </div>
                </form>

                <div id="cu-totp-section" style="display:none">
                    <hr class="uk-divider-muted uk-margin-top">
                    <h4 class="uk-margin-small-bottom kp-view-title">Two-Factor Authentication</h4>
                    <div class="uk-flex uk-flex-middle" style="gap:12px">
                        <span class="kp-badge kp-badge-manager" style="font-size:0.75rem">Disabled</span>
                        <button id="cu-totp-setup-btn" class="uk-button kp-btn-primary kp-btn-sm">Enable TOTP</button>
                    </div>
                    <div id="totp-setup-area" style="display:none" class="uk-margin-top">
                        <p class="kp-muted uk-text-small">Scan the QR code with your authenticator app, then enter the 6-digit code to activate.</p>
                        <div class="uk-text-center uk-margin-small" id="totp-qr-wrap">
                            <img id="totp-qr-img" style="display:none;width:220px;height:220px;border-radius:6px" alt="TOTP QR Code">
                        </div>
                        <p class="kp-muted uk-text-small uk-text-center uk-margin-remove-top">
                            Manual key: <code id="totp-secret-text" style="word-break:break-all"></code>
                        </p>
                        <div class="uk-flex" style="gap:8px;margin-top:8px">
                            <input class="uk-input kp-input" id="totp-confirm-code" type="text" inputmode="numeric" maxlength="6" placeholder="6-digit code" style="letter-spacing:0.2em">
                            <button id="cu-totp-confirm-btn" class="uk-button kp-btn-primary" style="white-space:nowrap">Confirm &amp; Enable</button>
                        </div>
                    </div>
                    <div class="uk-flex uk-flex-right uk-margin-top">
                        <button id="cu-totp-skip-btn" class="uk-button kp-btn-ghost">Skip for now</button>
                    </div>
                </div>
            </div>
        </div>`);let s=UIkit.modal("#kp-create-user-modal");s.show(),document.getElementById("create-user-form").addEventListener("submit",async a=>{a.preventDefault();let o=a.target.querySelector('[type="submit"]'),n=o.innerHTML;o.disabled=!0,o.innerHTML='<div uk-spinner="ratio: 0.6"></div> Creating...';let r=new FormData(a.target),i={fname:r.get("fname").trim(),lname:r.get("lname").trim(),uname:r.get("uname").trim(),email:r.get("email").trim(),phone:r.get("phone").trim(),password:r.get("password"),role:parseInt(r.get("role")),notify_email:r.get("notify_email")==="on",notify_sms:r.get("notify_sms")==="on"};try{let l=F(await m.post("/users",i));document.getElementById("users-table-body").insertAdjacentHTML("beforeend",Lt(l)),c.success(`User '${l.uname}' created`),document.getElementById("create-user-form").style.display="none",document.getElementById("cu-totp-section").style.display="",is(l.id,s)}catch(l){c.error(l.message),o.disabled=!1,o.innerHTML=n}}),document.getElementById("kp-create-user-modal").addEventListener("hidden",()=>document.getElementById("kp-create-user-modal")?.remove())}function is(t,e){let s=()=>{e.hide(),document.getElementById("kp-create-user-modal")?.remove(),y.go("users")};document.getElementById("cu-totp-skip-btn").addEventListener("click",s),document.getElementById("cu-totp-setup-btn").addEventListener("click",async()=>{let a=document.getElementById("cu-totp-setup-btn");a.disabled=!0,a.textContent="Setting up\u2026";try{let o=await m.post(`/users/${t}/totp/setup`,{});document.getElementById("totp-secret-text").textContent=o.secret,document.getElementById("totp-setup-area").style.display="",document.getElementById("cu-totp-skip-btn").style.display="none",await dt(o.uri)}catch(o){c.error(o.message),a.disabled=!1,a.textContent="Enable TOTP"}}),document.getElementById("cu-totp-confirm-btn").addEventListener("click",async()=>{let a=document.getElementById("totp-confirm-code").value.trim();if(a.length!==6){c.error("Enter a 6-digit code");return}let o=document.getElementById("cu-totp-confirm-btn");o.disabled=!0;try{let n=await m.post(`/users/${t}/totp/confirm`,{code:a});e.hide(),document.getElementById("kp-create-user-modal")?.remove(),c.success("TOTP enabled"),n.backup_codes?.length?ut(n.backup_codes):y.go("users")}catch(n){c.error(n.message),o.disabled=!1}})}async function we(t,e){document.getElementById("kp-edit-user-modal")?.remove();let s;try{s=F(await m.get(`/users/${e}`))}catch(d){c.error(d.message);return}let a=window.KP?.user?.role===99,o=`
        <div id="kp-edit-user-modal" uk-modal>
            <div class="uk-modal-dialog kp-modal uk-modal-body uk-width-large">
                <button class="uk-modal-close-default" type="button" uk-close></button>
                <h3 class="kp-view-title">Edit User \u2014 ${s.uname}</h3>
                <form id="edit-user-form" class="uk-form-stacked uk-margin-top">
                    <div class="uk-grid-small" uk-grid>
                        ${a?`
                        <div class="uk-width-1-1">
                            <label class="kp-label">Username</label>
                            <input class="uk-input kp-input" name="uname" type="text" value="${g(s.uname)}" autocomplete="off">
                        </div>`:""}
                        <div class="uk-width-1-2@s">
                            <label class="kp-label">First Name</label>
                            <input class="uk-input kp-input" name="fname" type="text" value="${g(s.fname)}" required>
                        </div>
                        <div class="uk-width-1-2@s">
                            <label class="kp-label">Last Name</label>
                            <input class="uk-input kp-input" name="lname" type="text" value="${g(s.lname)}" required>
                        </div>
                        <div class="uk-width-1-2@s">
                            <label class="kp-label">Email</label>
                            <input class="uk-input kp-input" name="email" type="email" value="${g(s.email)}" required>
                        </div>
                        <div class="uk-width-1-2@s">
                            <label class="kp-label">Phone</label>
                            <input class="uk-input kp-input" name="phone" type="tel" value="${g(s.phone||"")}" required>
                        </div>
                        <div class="uk-width-1-1">
                            <label class="kp-label uk-margin-small-bottom">Notifications</label>
                            <div class="uk-flex" style="gap:24px">
                                <label><input class="uk-checkbox" type="checkbox" name="notify_email" ${s.notify_email?"checked":""}> &nbsp;Email</label>
                                <label><input class="uk-checkbox" type="checkbox" name="notify_sms" ${s.notify_sms?"checked":""}> &nbsp;SMS</label>
                            </div>
                        </div>
                        ${a?`
                        <div class="uk-width-1-2@s">
                            <label class="kp-label">Role</label>
                            <select class="uk-select kp-select" name="role">
                                <option value="50" ${s.role===50?"selected":""}>Manager</option>
                                <option value="99" ${s.role===99?"selected":""}>Admin</option>
                            </select>
                        </div>`:""}
                        <div class="uk-width-1-2@s">
                            <label class="kp-label">New Password</label>
                            <input class="uk-input kp-input" name="password" type="password" placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" uk-tooltip="leave blank to keep">
                        </div>
                        <div class="uk-margin" id="edit-user-current-pw" hidden>
                            <label class="uk-form-label">Current Password</label>
                            <input class="uk-input kp-input" name="current_password" type="password" placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" uk-tooltip="required when changing your own password">
                        </div>                            
                    </div>
                    <div class="uk-flex uk-flex-right uk-margin-top" style="gap:8px">
                        <button type="button" class="uk-button kp-btn-ghost uk-modal-close">Cancel</button>
                        <button type="submit" class="uk-button kp-btn-primary">Save Changes</button>
                    </div>
                </form>

                <hr class="uk-divider-muted uk-margin-top">

                <div id="totp-section">
                    <h4 class="uk-margin-small-bottom kp-view-title">Two-Factor Authentication</h4>
                    ${s.totp_enabled?`<div class="uk-flex uk-flex-middle" style="gap:12px">
                            <span class="kp-badge kp-badge-admin" style="font-size:0.75rem">Enabled</span>
                            <button id="totp-disable-btn" class="uk-button kp-btn-secondary kp-btn-sm">Disable TOTP</button>
                           </div>`:`<div class="uk-flex uk-flex-middle" style="gap:12px">
                            <span class="kp-badge kp-badge-manager" style="font-size:0.75rem">Disabled</span>
                            <button id="totp-setup-btn" class="uk-button kp-btn-primary kp-btn-sm">Enable TOTP</button>
                           </div>`}
                    <div id="totp-setup-area" style="display:none" class="uk-margin-top">
                        <p class="kp-muted uk-text-small">Scan the QR code with your authenticator app, then enter the 6-digit code to activate.</p>
                        <div class="uk-text-center uk-margin-small" id="totp-qr-wrap">
                            <img id="totp-qr-img" style="display:none;width:220px;height:220px;border-radius:6px" alt="TOTP QR Code">
                        </div>
                        <p class="kp-muted uk-text-small uk-text-center uk-margin-remove-top">
                            Manual key: <code id="totp-secret-text" style="word-break:break-all"></code>
                        </p>
                        <div class="uk-flex" style="gap:8px;margin-top:8px">
                            <input class="uk-input kp-input" id="totp-confirm-code" type="text" inputmode="numeric" maxlength="6" placeholder="6-digit code" style="letter-spacing:0.2em">
                            <button id="totp-confirm-btn" class="uk-button kp-btn-primary" style="white-space:nowrap">Confirm &amp; Enable</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;document.body.insertAdjacentHTML("beforeend",o);let n=UIkit.modal("#kp-edit-user-modal");n.show(),document.getElementById("edit-user-form").addEventListener("submit",async d=>{d.preventDefault();let k=d.target.querySelector('[type="submit"]'),b=k.innerHTML;k.disabled=!0,k.innerHTML='<div uk-spinner="ratio: 0.6"></div> Saving...';let u=new FormData(d.target),p={fname:u.get("fname").trim(),lname:u.get("lname").trim(),email:u.get("email").trim(),phone:u.get("phone").trim(),notify_email:u.get("notify_email")==="on",notify_sms:u.get("notify_sms")==="on"};if(a){p.role=parseInt(u.get("role"));let h=u.get("uname");h&&(p.uname=h.trim())}let v=u.get("password");v&&(p.password=v),Number(e)===Number(window.KP?.user?.id)&&document.getElementById("edit-user-current-pw")?.removeAttribute("hidden");try{await m.put(`/users/${e}`,p),n.hide(),document.getElementById("kp-edit-user-modal")?.remove(),c.success("User updated"),y.go("users")}catch(h){c.error(h.message),k.disabled=!1,k.innerHTML=b}});let r=document.getElementById("totp-setup-btn");r&&r.addEventListener("click",async()=>{r.disabled=!0,r.textContent="Setting up\u2026";try{let d=await m.post(`/users/${e}/totp/setup`,{});document.getElementById("totp-secret-text").textContent=d.secret,document.getElementById("totp-setup-area").style.display="",await dt(d.uri)}catch(d){c.error(d.message),r.disabled=!1,r.textContent="Enable TOTP"}});let i=document.getElementById("totp-confirm-btn");i&&i.addEventListener("click",async()=>{let d=document.getElementById("totp-confirm-code").value.trim();if(d.length!==6){c.error("Enter a 6-digit code");return}i.disabled=!0;try{let k=await m.post(`/users/${e}/totp/confirm`,{code:d});n.hide(),document.getElementById("kp-edit-user-modal")?.remove(),c.success("TOTP enabled"),k.backup_codes?.length?ut(k.backup_codes):y.go("users")}catch(k){c.error(k.message),i.disabled=!1}});let l=document.getElementById("totp-disable-btn");l&&l.addEventListener("click",async()=>{l.disabled=!0;try{await m.delete(`/users/${e}/totp`),c.success("TOTP disabled"),n.hide(),document.getElementById("kp-edit-user-modal")?.remove(),y.go("users")}catch(d){c.error(d.message),l.disabled=!1}}),document.getElementById("kp-edit-user-modal").addEventListener("hidden",()=>document.getElementById("kp-edit-user-modal")?.remove())}async function xe(t){if(!q()){t.innerHTML=P("Access denied");return}let e=await m.get("/users");t.innerHTML=`
        <div class="kp-view-header">
            <h1 class="kp-view-title kp-cursor" style="font-size:2rem;">Users</h1>
            <button class="uk-button kp-btn-primary" id="users-new-btn">
                <span uk-icon="plus"></span> New User
            </button>
        </div>
        <div class="kp-table-wrap">
            <div class="uk-overflow-auto">
            <table class="uk-table uk-table-divider uk-table-middle uk-margin-remove">
                <thead>
                    <tr>
                        <th>User</th>
                        <th>Username</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th class="uk-text-center">2FA</th>
                        <th class="uk-text-center">Notify</th>
                        <th>Created</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody id="users-table-body">
                    ${e.map(s=>Lt(F(s))).join("")}
                </tbody>
            </table>
            </div>
        </div>`,document.getElementById("users-new-btn").addEventListener("click",()=>ye(t)),ls(t)}function Lt(t){let e=t.role===99?'<span class="kp-badge kp-badge-admin">Admin</span>':'<span class="kp-badge kp-badge-manager">Manager</span>',s=[t.notify_email?'<span uk-icon="icon: mail; ratio: 0.85" uk-tooltip="Email notifications on" style="color:var(--kp-success)"></span>':'<span uk-icon="icon: mail; ratio: 0.85" style="color:var(--kp-text-dim)" uk-tooltip="Email notifications off"></span>',t.notify_sms?'<span uk-icon="icon: receiver; ratio: 0.85" uk-tooltip="SMS notifications on" style="color:var(--kp-success)"></span>':'<span uk-icon="icon: receiver; ratio: 0.85" style="color:var(--kp-text-dim)" uk-tooltip="SMS notifications off"></span>'].join(" ");return`<tr data-user-id="${t.id}">
        <td><strong>${g(t.fname)} ${g(t.lname)}</strong></td>
        <td><span style="font-family:monospace">${g(t.uname)}</span></td>
        <td>${g(t.email)}</td>
        <td>${e}</td>
        <td class="uk-text-center">${t.totp_enabled?'<span uk-icon="icon: check; ratio: 0.9" style="color:var(--kp-success)"></span>':'<span uk-icon="icon: close; ratio: 0.9" style="color:var(--kp-text-dim)"></span>'}</td>
        <td class="uk-text-center">${s}</td>
        <td><span class="kp-muted">${g(t.created)}</span></td>
        <td>
            <div class="uk-flex" style="gap:6px;justify-content:flex-end">
                <button class="uk-button kp-btn-ghost kp-btn-sm" data-action="edit-user" data-uid="${t.id}" title="Edit" uk-tooltip="Edit the User">
                    <span uk-icon="icon: pencil;"></span>
                </button>
                <button class="uk-button kp-btn-secondary kp-btn-sm" data-action="delete-user" data-uid="${t.id}" title="Delete" uk-tooltip="Delete the User">
                    <span uk-icon="icon: trash;"></span>
                </button>
            </div>
        </td>
    </tr>`}function ls(t){t.addEventListener("click",async e=>{let s=e.target.closest('[data-action="delete-user"]');if(!(!s||!await L("Delete User","Delete this user? This cannot be undone.")))try{await m.delete(`/users/${s.dataset.uid}`),s.closest("tr").remove(),c.success("User deleted")}catch(o){c.error(o.message)}}),t.addEventListener("click",async e=>{let s=e.target.closest('[data-action="edit-user"]');s&&we(t,s.dataset.uid)})}y.register("dashboard",t=>Rt(t));y.register("sites",t=>At(t));y.register("site-detail",(t,e)=>fe(t,e));y.register("users",t=>xe(t));y.register("settings",t=>Ut(t));y.register("security",t=>Dt(t));y.register("admin-logs",t=>Pt(t));y.register("audit-log",t=>qt(t));document.addEventListener("keydown",t=>{let e=t.target;e?.matches?.("input, textarea, select, [contenteditable='true']")&&(e.closest?.(".CodeMirror")||e.id==="wpcli-input"&&(t.key==="ArrowUp"||t.key==="ArrowDown")||["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","Home","End"].includes(t.key)&&t.stopPropagation())},!0);document.addEventListener("click",t=>{let e=t.target.closest("[data-view]");e&&(t.preventDefault(),y.go(e.dataset.view))});document.addEventListener("click",async t=>{let e=t.target.closest("[data-action]");if(!e)return;t.stopPropagation();let{action:s,id:a}=e.dataset;switch(s){case"manage":y.go("site-detail",{id:a});break;case"start":await pt(a,"start","Starting Site","Starting all containers - please wait...");break;case"stop":await pt(a,"stop","Stopping Site","Gracefully stopping all containers - please wait...");break;case"restart":await pt(a,"restart","Restarting Site","Restarting all containers - please wait...");break;case"flush":await pt(a,"flush","Flushing Caches","Clearing container caches - please wait...");break;case"delete":await rs(a);break;case"recreate":$("Recreating Pod","Recreating containers for this site - this may take a few minutes...");try{await m.post(`/sites/${a}/recreate`),x(),c.success("Pod recreated"),y.go("sites")}catch(o){x(),c.error(o.message)}break}});document.addEventListener("kp:bulk-action",async t=>{let{action:e,ids:s}=t.detail;if(!s.length)return;let a={start:"Starting",stop:"Stopping",restart:"Restarting",flush:"Flushing Caches",recreate:"Recreating"},o=e==="recreate"?"Please hold while we update your Pods":"Please wait...",n=e==="recreate"?{prune:!0}:void 0,r=e==="recreate"?1200*1e3:void 0;$(`${a[e]} ${s.length} Site${s.length!==1?"s":""}`,o);let i=await Promise.allSettled(s.map(d=>m.post(`/sites/${d}/${e}`,n,r)));x();let l=i.filter(d=>d.status==="rejected").length;l===0?c.success(`${e.charAt(0).toUpperCase()+e.slice(1)} complete for ${s.length} site${s.length!==1?"s":""}`):c.error(`${l} of ${s.length} sites failed \u2014 check logs`),["start","stop","restart","recreate"].includes(e)&&y.go("sites")});async function pt(t,e,s,a){$(s,a);try{if(await m.post(`/sites/${t}/${e}`),x(),c.success(s+" complete"),e!=="flush"){let{view:o,params:n}=st();y.go(o,n)}}catch(o){x(),c.error(o.message)}}async function rs(t){if(!await L("Delete Site",`This will stop and permanently remove the pod and all its data. Are you sure?

A final backup will be created before deletion. This may take a moment.`))return;$("Deleting Site","Creating final backup and removing the pod \u2014 please wait...");let s;try{s=await fetch(`/api/sites/${t}`,{method:"DELETE",headers:{"X-CSRF-Token":window.KP?.csrf??""}})}catch{}if(x(),s?.ok&&s.headers.get("Content-Type")?.includes("gzip")){let r=(s.headers.get("Content-Disposition")??"").match(/filename="([^"]+)"/)?.[1]??`${t}_final.tar.gz`,i=await s.blob(),l=document.createElement("a");l.href=URL.createObjectURL(i),l.download=r,l.click(),URL.revokeObjectURL(l.href),c.success("Site deleted. Final backup downloaded."),y.go("sites");return}let a=!1,o=0;for(;!a&&o<10;){try{await new Promise(r=>setTimeout(r,2e3)),a=!(await m.get("/sites")).find(r=>r.ID===parseInt(t))}catch{}o++}a?(c.success("Site deleted. Final backup saved to S3."),y.go("sites")):c.error("Delete failed - site still exists after 20s")}if(window.KP?.user?.role===99){let t=document.getElementById("kp-resource-warning"),e=document.getElementById("kp-resource-warning-msg"),s=async()=>{try{let a=await m.get("/settings/resource-warning");a?.active&&t&&e?(e.textContent=`${a.current_mb}MB used, threshold ${a.threshold_mb}MB \u2014 throttling ${a.offender}.`,t.style.display=""):t&&(t.style.display="none")}catch{}};s(),setInterval(s,3e4)}window.addEventListener("hashchange",()=>{if(y._ownHashChange)return;let{view:t,params:e}=st();y.go(t,e)});(()=>{let t=document.getElementById("kp-totop");if(!t)return;let e=()=>{t.classList.toggle("is-visible",window.scrollY>150)};window.addEventListener("scroll",e,{passive:!0}),e(),t.addEventListener("click",()=>{window.scrollTo({top:0,behavior:"smooth"})})})();(()=>{let t=document.querySelectorAll(".kp-logout-link");t.length&&t.forEach(e=>{e.addEventListener("click",async s=>{s.preventDefault(),await fetch("/logout",{method:"POST",headers:{"X-CSRF-Token":window.KP?.csrf??""}}),window.location.href="/login"})})})();var{view:cs,params:ds}=st();y.go(cs,ds);})();
