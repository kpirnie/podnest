/*! PodNest - Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com> | MIT License */

"use strict";(()=>{var p={async _req(t,e,a,s=6e4){let i=new AbortController,n=setTimeout(()=>i.abort(),s),o={method:t,headers:{"Content-Type":"application/json"},signal:i.signal};t!=="GET"&&t!=="HEAD"&&(o.headers["X-CSRF-Token"]=window.KP?.csrf??""),a!==void 0&&(o.body=JSON.stringify(a));try{let l=await fetch("/api"+e,o);clearTimeout(n);let r=l.status===204?null:await l.json().catch(()=>null);if(l.status===401)return window.location.href="/login?msg=Your+session+has+expired+%E2%80%94+please+log+in+again",null;if(!l.ok)throw new Error(r?.error||`HTTP ${l.status}`);return r}catch(l){throw clearTimeout(n),l}},get:t=>p._req("GET",t),post:(t,e,a)=>p._req("POST",t,e,a),put:(t,e,a)=>p._req("PUT",t,e,a),delete:t=>p._req("DELETE",t),patch:(t,e)=>p._req("PATCH",t,e)};var g=t=>String(t).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");function L(t){return t===0?"0 B":t<1024?`${t} B`:t<1048576?`${(t/1024).toFixed(1)} KB`:t<1073741824?`${(t/1048576).toFixed(1)} MB`:`${(t/1073741824).toFixed(2)} GB`}var at=()=>'<div class="kp-spinner"><div uk-spinner="ratio: 1.25"></div></div>',T=t=>`<div class="kp-empty">
        <div class="kp-empty-icon" uk-icon="icon: warning; ratio: 2.5"></div>
        <div class="kp-empty-text">${t}</div>
    </div>`,st=(t,e)=>`<div class="kp-empty">
        <div class="kp-empty-icon" uk-icon="icon: ${t}; ratio: 2.5"></div>
        <div class="kp-empty-text">${e}</div>
    </div>`,M=t=>{let e={1:["running","Running"],2:["stopped","Stopped"],3:["restarting","Restarting"],4:["error","Error"]},[a,s]=e[t]||["stopped","Unknown"];return`<span class="kp-status kp-status-${a}">${s}</span>`},Me=t=>({3:"8.2",4:"8.3",5:"8.4",6:"8.5"})[t]||"?",J=t=>({1:"WordPress",2:"PHP",3:"Static",4:"Node.js",5:".NET",6:"Reverse Proxy",7:"Python"})[t]||"?",P=()=>window.KP.user.role===window.KP.roles.admin,R=t=>{switch(t.SiteType){case 1:case 2:return`PHP ${Me(t.PHPVersion)}`;case 4:return`Node ${{2:"22",4:"24",5:"25",6:"26"}[t.RuntimeVersion]||"?"}`;case 5:return`.NET ${{1:"8.0",2:"9.0",3:"10.0"}[t.RuntimeVersion]||"?"}`;case 7:return`Python ${{1:"3.11",2:"3.12",3:"3.13",4:"3.14"}[t.RuntimeVersion]||"?"}`;case 6:return"Reverse Proxy";default:return""}},F=t=>({id:t.id??t.ID,uname:t.uname??t.UName,uhash:t.uhash??t.UHash,fname:t.fname??t.FName,lname:t.lname??t.LName,email:t.email??t.Email,phone:t.phone??t.Phone,role:t.role??t.Role,totp_enabled:t.totp_enabled??!1,notify_email:t.notify_email??!1,notify_sms:t.notify_sms??!1,created:t.created??t.Created});function E(t,e){return new Promise(a=>{document.getElementById("kp-confirm-title").textContent=t,document.getElementById("kp-confirm-message").textContent=e;let s=UIkit.modal("#kp-confirm-modal");document.getElementById("kp-confirm-ok").addEventListener("click",()=>{s.hide(),a(!0)},{once:!0}),s.show(),document.getElementById("kp-confirm-modal").addEventListener("hidden",()=>a(!1),{once:!0})})}function $(t,e){let a=`
        <div id="kp-progress-modal" uk-modal="bg-close: false; esc-close: false; keyboard: false">
            <div class="uk-modal-dialog kp-modal uk-modal-body uk-text-center" style="max-width:420px">
                <div uk-spinner="ratio: 1.5" style="color:var(--kp-blue)"></div>
                <h3 class="uk-modal-title uk-margin-small-top" id="kp-progress-title">${t}</h3>
                <p class="kp-muted uk-text-small" id="kp-progress-message">${e}</p>
                <p class="kp-muted">
                    This may take several minutes while the task(s) complete, make sure to keep screen open until it has completed.
                </p>
            </div>
        </div>`;document.body.insertAdjacentHTML("beforeend",a),UIkit.modal("#kp-progress-modal").show()}function x(){let t=document.getElementById("kp-progress-modal");t&&(UIkit.modal(t).hide(),setTimeout(()=>t.remove(),300))}function Ht(t){return new Promise(e=>{let a="kp-clone-modal",s=`
            <div id="${a}" uk-modal>
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
            </div>`;document.body.insertAdjacentHTML("beforeend",s);let i=UIkit.modal(`#${a}`),n=document.getElementById("kp-clone-name"),o=document.getElementById("kp-clone-ok"),l=document.getElementById("kp-clone-cancel"),r=c=>{i.hide(),setTimeout(()=>document.getElementById(a)?.remove(),300),e(c)};o.addEventListener("click",()=>r(n.value.trim()||null),{once:!0}),l.addEventListener("click",()=>r(null),{once:!0}),document.getElementById(a).addEventListener("hidden",()=>r(null),{once:!0}),i.show(),setTimeout(()=>n.focus(),150),n.addEventListener("keydown",c=>{c.key==="Enter"&&o.click()})})}function Dt(t){return new Promise(e=>{let a="kp-rename-modal",s=`
            <div id="${a}" uk-modal>
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
            </div>`;document.body.insertAdjacentHTML("beforeend",s);let i=UIkit.modal(`#${a}`),n=document.getElementById("kp-rename-name"),o=document.getElementById("kp-rename-ok"),l=document.getElementById("kp-rename-cancel"),r=c=>{i.hide(),setTimeout(()=>document.getElementById(a)?.remove(),300),e(c)};o.addEventListener("click",()=>r(n.value.trim()||null),{once:!0}),l.addEventListener("click",()=>r(null),{once:!0}),document.getElementById(a).addEventListener("hidden",()=>r(null),{once:!0}),i.show(),setTimeout(()=>n.focus(),150),n.addEventListener("keydown",c=>{c.key==="Enter"&&o.click()})})}function gt(t,e,a){return new Promise(s=>{let i="kp-sync-modal",n=t==="pull",o=n?"Pull From Parent":"Push To Parent",l=n?"cloud-download":"cloud-upload",r=n?a:e,c=n?e:a,h=`
            <div id="${i}" uk-modal>
                <div class="uk-modal-dialog kp-modal uk-modal-body" style="max-width:460px">
                    <h3 class="uk-modal-title">${o}</h3>
                    <p class="kp-muted uk-text-small uk-margin-small-bottom">
                        This will overwrite all files and database content on
                        <strong>${c}</strong> with data from <strong>${r}</strong>.
                        This action cannot be undone.
                    </p>
                    <p class="kp-muted uk-text-small" style="color:var(--kp-red, #e05c5c)">
                        <span uk-icon="icon: warning; ratio: 0.85"></span>
                        <strong>${c}</strong> will be temporarily unavailable during the sync.
                    </p>
                    <div class="uk-flex uk-flex-right uk-margin-top" style="gap:8px">
                        <button class="uk-button kp-btn-ghost uk-modal-close" id="kp-sync-cancel">Cancel</button>
                        <button class="uk-button kp-btn-primary" id="kp-sync-ok">
                            <span uk-icon="${l}"></span> ${o}
                        </button>
                    </div>
                </div>
            </div>`;document.body.insertAdjacentHTML("beforeend",h);let k=UIkit.modal(`#${i}`),d=document.getElementById("kp-sync-ok"),m=document.getElementById("kp-sync-cancel"),b=v=>{k.hide(),setTimeout(()=>document.getElementById(i)?.remove(),300),s(v)};d.addEventListener("click",()=>b(!0),{once:!0}),m.addEventListener("click",()=>b(!1),{once:!0}),document.getElementById(i).addEventListener("hidden",()=>b(!1),{once:!0}),k.show()})}var y={routes:{},_ownHashChange:!1,register(t,e){this.routes[t]=e},async go(t,e={}){let a=Object.keys(e).length?t+"/"+Object.values(e).join("/"):t;this._ownHashChange=!0,window.location.hash=a,setTimeout(()=>{this._ownHashChange=!1},0),document.querySelectorAll(".kp-nav-link").forEach(n=>{n.classList.toggle("kp-active",n.dataset.view===t)}),document.querySelectorAll(".kp-bn-item[data-view]").forEach(n=>{n.classList.toggle("kp-active",n.dataset.view===t)});let s=this.routes[t];if(!s)return;let i=document.getElementById("kp-view");i.innerHTML=at();try{await s(i,e)}catch(n){i.innerHTML=T(n.message)}}};function nt(){let e=(window.location.hash.replace("#","")||"dashboard").split("/"),a=e[0],s={};return a==="site-detail"&&e[1]&&(s.id=e[1]),a==="settings"&&e[1]&&(s.tab=e[1]),a==="site-detail"&&e[2]&&(s.tab=e[2]),a==="security"&&e[1]&&(s.tab=e[1]),a==="waf"&&e[1]&&(s.tab=e[1]),{view:a,params:s}}var u={show(t,e="info",a=7e3){let s={success:"check",error:"warning",info:"info"},i=document.createElement("div");i.className=`kp-toast kp-toast-${e}`,i.innerHTML=`<span uk-icon="${s[e]||"info"}"></span><span>${g(t)}</span>`,document.getElementById("kp-toasts").appendChild(i),UIkit.icon(i.querySelector("[uk-icon]")),setTimeout(()=>i.remove(),a)},success:t=>u.show(t,"success"),error:t=>u.show(t,"error"),info:t=>u.show(t,"info")};var Re=2e3;function He(){return`
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
        </div>`}function De(t){let e=null,a=!1,s=t.querySelector("#admin-log-output"),i=t.querySelector("#admin-log-connect"),n=t.querySelector("#admin-log-disconnect"),o=t.querySelector("#admin-log-clear"),l=t.querySelector("#admin-log-autoscroll"),r=t.querySelector("#admin-log-status");function c(d){for(d.split(`
`).forEach(m=>{if(!m)return;let b=document.createElement("div");b.className=m.match(/WAF BLOCK/i)?"kp-log-line-err":m.match(/WAF DETECT/i)?"kp-log-line-warn":m.match(/error|crit|emerg/i)?"kp-log-line-err":m.match(/warn/i)?"kp-log-line-warn":m.match(/info|notice/i)?"kp-log-line-info":"",b.textContent=m,s.appendChild(b)});s.childElementCount>Re;)s.removeChild(s.firstChild);l.checked&&(s.scrollTop=s.scrollHeight)}function h(){e&&(e.close(),e=null),a=!1,i.disabled=!1,n.disabled=!0,r&&(r.textContent="Disconnected")}i.addEventListener("click",()=>{h();let d=t.querySelector("#admin-log-source").value,m=t.querySelector("#admin-log-tail").value,b=location.protocol==="https:"?"wss":"ws",v=d==="waf"?`${b}://${location.host}/api/logs/waf?tail=${m}`:`${b}://${location.host}/api/logs/proxy?tail=${m}`;e=new WebSocket(v),e.onopen=()=>{a=!0,i.disabled=!0,n.disabled=!1,r&&(r.textContent=`Connected \u2014 ${d==="waf"?"WAF Log":"Proxy Access Log"}`)},e.onmessage=f=>c(f.data),e.onerror=()=>{},e.onclose=()=>{a=!1,i.disabled=!1,n.disabled=!0,r&&(r.textContent="Disconnected")}}),n.addEventListener("click",h),o.addEventListener("click",()=>{s.innerHTML=""}),t.querySelector("#admin-log-source").addEventListener("change",()=>{e&&e.readyState===WebSocket.OPEN&&(h(),i.click())});let k=y.go.bind(y);y.go=function(d,m={}){return e&&h(),k(d,m)}}function Ft(t){t.innerHTML=He(),De(t)}var ot=50;function Fe(t,e,a){let s=Math.max(1,Math.ceil(t.total/ot)),i=(t.entries??[]).map(Ut).join("")||'<tr><td colspan="8" class="uk-text-center" style="color:var(--kp-text-dim)">No records found</td></tr>';return`
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
                    <tbody id="al-table-body">${i}</tbody>
                </table>
                </div>
            </div>

            ${s>1?`<div id="al-pager">${Nt(a,s)}</div>`:'<div id="al-pager"></div>'}
        </div>`}function Ut(t){let e=new Date(t.ts).toLocaleString(),a=t.username?`<span style="font-family:monospace">${_(t.username)}</span>`:'<span style="color:var(--kp-text-dim)">\u2014</span>',s=Ue(t.status),n=t.prior_state||t.new_state?`<button class="uk-button kp-btn-ghost kp-btn-sm al-diff-btn"
                data-prior="${_(t.prior_state)}" data-new="${_(t.new_state)}">
               <span uk-icon="icon: git-fork; ratio: 0.85"></span>
           </button>`:"<span>\u2014</span>",o=t.details?`<button class="uk-button kp-btn-ghost kp-btn-sm al-diff-btn"
                data-prior="" data-new="${_(t.details)}">
               <span uk-icon="icon: info; ratio: 0.85"></span>
           </button>`:"<span>\u2014</span>";return`<tr>
        <td style="white-space:nowrap;font-size:0.82rem">${e}</td>
        <td>${a}</td>
        <td style="font-family:monospace;font-size:0.82rem">${_(t.ip)}</td>
        <td><span class="kp-badge">${_(t.method)}</span></td>
        <td style="font-family:monospace;font-size:0.82rem">${_(t.action)}</td>
        <td>${s}</td>
        <td>${o}</td>
        <td>${n}</td>
    </tr>`}function Nt(t,e){let a=t>1?'<button class="uk-button kp-btn-ghost kp-btn-sm" id="al-prev">\u2039 Prev</button>':"",s=t<e?'<button class="uk-button kp-btn-ghost kp-btn-sm" id="al-next">Next \u203A</button>':"";return`<div class="uk-flex uk-flex-middle uk-flex-center uk-margin-small-top" style="gap:12px">
        ${a}
        <span style="font-size:0.85rem;color:var(--kp-text-dim)">Page ${t} of ${e}</span>
        ${s}
    </div>`}function Ue(t){return`<span class="kp-badge ${t>=500?"kp-badge-error":t>=400?"kp-badge-warn":t>=300?"kp-badge-info":"kp-badge-ok"}">${t}</span>`}var _=t=>g(t??"");async function Wt(t,e){let a=new URLSearchParams({page:e,page_size:ot});return t.username&&a.set("username",t.username),t.action&&a.set("action",t.action),t.target_type&&a.set("target_type",t.target_type),t.date_from&&a.set("date_from",t.date_from),t.date_to&&a.set("date_to",t.date_to),t.auth!==""&&a.set("auth",t.auth),p.get(`/audit?${a}`)}function Ne(t){return{username:t.querySelector("#al-filter-user").value.trim(),action:t.querySelector("#al-filter-action").value.trim(),target_type:t.querySelector("#al-filter-target").value.trim(),date_from:t.querySelector("#al-filter-date-from").value,date_to:t.querySelector("#al-filter-date-to").value,auth:t.querySelector("#al-filter-auth").value}}async function We(t,e,a){async function s(o,l){let r=await Wt(o,l);t.querySelector("#al-table-body").innerHTML=(r.entries??[]).map(Ut).join("")||'<tr><td colspan="8" class="uk-text-center kp-text-dim">No records found</td></tr>';let c=Math.max(1,Math.ceil(r.total/ot)),h=t.querySelector("#al-pager");h&&(h.innerHTML=c>1?Nt(l,c):""),t.querySelector("#al-record-count").textContent=`${r.total} record${r.total!==1?"s":""}`,i(t,o,l,c),e=o,a=l}function i(o,l,r,c){o.querySelector("#al-prev")?.addEventListener("click",()=>s(l,r-1)),o.querySelector("#al-next")?.addEventListener("click",()=>s(l,r+1))}t.querySelector("#al-filter-apply")?.addEventListener("click",()=>{s(Ne(t),1)}),t.querySelector("#al-filter-clear")?.addEventListener("click",()=>{["al-filter-user","al-filter-action","al-filter-target","al-filter-date-from","al-filter-date-to"].forEach(o=>{let l=t.querySelector(`#${o}`);l&&(l.value="")}),t.querySelector("#al-filter-auth").value="",s({username:"",action:"",target_type:"",date_from:"",date_to:"",auth:""},1)});let n=Math.max(1,Math.ceil(parseInt(t.querySelector("#al-record-count")?.textContent??"0")/ot));i(t,e,a,n),t.querySelector("#audit-log-panel")?.addEventListener("click",o=>{let l=o.target.closest(".al-diff-btn");if(!l)return;o.preventDefault(),o.stopPropagation();let r=l.dataset.prior??"",c=l.dataset.new??"",h="";r&&c?h=`=== BEFORE ===
`+it(r)+`

=== AFTER ===
`+it(c):c?h=it(c):h=it(r),document.body.insertAdjacentHTML("beforeend",`
            <div id="al-diff-modal-inst" uk-modal>
                <div class="uk-modal-dialog kp-modal uk-modal-body uk-width-large">
                    <button class="uk-modal-close-default" type="button" uk-close></button>
                    <h3 class="kp-view-title uk-margin-bottom">Request Detail</h3>
                    <pre class="kp-cron-output">${_(h)}</pre>
                </div>
            </div>`);let k=document.getElementById("al-diff-modal-inst");UIkit.modal(k).show(),k.addEventListener("hidden",()=>k.remove(),{once:!0})})}function it(t){try{return JSON.stringify(JSON.parse(t),null,2)}catch{return t}}async function jt(t){if(!P()){t.innerHTML=T("Access denied");return}let e={username:"",action:"",target_type:"",date_from:"",date_to:"",auth:""},a=await Wt(e,1);t.innerHTML=Fe(a,e,1),We(t,e,1)}function lt(){document.body.insertAdjacentHTML("beforeend",`
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
        </div>`);let e=UIkit.modal("#kp-create-site-modal"),a=document.getElementById("cs-site-type"),s=document.getElementById("cs-php-version-wrap"),i=document.getElementById("cs-node-version-wrap"),n=document.getElementById("cs-dotnet-version-wrap"),o=document.getElementById("cs-python-version-wrap"),l=document.getElementById("cs-start-command-wrap"),r=document.getElementById("cs-wordpress-wrap");e.show();let c=document.getElementById("cs-domains-wrap"),h=document.getElementById("cs-rp-note");a.addEventListener("change",()=>{let k=parseInt(a.value);s.classList.toggle("uk-hidden",k!==1&&k!==2||k===6),i.classList.toggle("uk-hidden",k!==4),n.classList.toggle("uk-hidden",k!==5),o.classList.toggle("uk-hidden",k!==7),l.classList.toggle("uk-hidden",k!==4&&k!==5&&k!==7),l.querySelector("input").required=k===7,r.classList.toggle("uk-hidden",k!==1||k===6),c.classList.toggle("uk-hidden",k===6),h.classList.toggle("uk-hidden",k!==6)}),document.getElementById("create-site-form").addEventListener("submit",async k=>{k.preventDefault();let d=k.target.querySelector('[type="submit"]'),m=d.innerHTML;d.disabled=!0,d.innerHTML='<div uk-spinner="ratio: 0.6"></div> Creating...';let b=new FormData(k.target),v=parseInt(b.get("site_type")),f=null;v===4&&(f=parseInt(b.get("node_version"))),v===5&&(f=parseInt(b.get("dotnet_version"))),v===7&&(f=parseInt(b.get("python_version")));let w={name:b.get("name").trim(),php_version:parseInt(b.get("php_version"))||3,site_type:v,runtime_version:f,start_command:b.get("start_command")?.trim()||"",domains:b.get("domains").split(`
`).map(I=>I.trim()).filter(Boolean),install_wordpress:v===1?b.get("install_wordpress")==="on":!1};e.hide(),document.getElementById("kp-create-site-modal")?.remove();let S=v===6?`Setting up '${w.name}' as a reverse proxy...`:`Setting up '${w.name}' \u2014 pulling images and provisioning containers...`;$("Creating Site",S);try{await p.post("/sites",w,6e5),x(),u.success(`Site '${w.name}' created`),y.go("sites")}catch(I){x(),u.error(I.message),d.disabled=!1,d.innerHTML=m}}),document.getElementById("kp-create-site-modal").addEventListener("hidden",()=>document.getElementById("kp-create-site-modal")?.remove())}var U=null;function je(t){return`${t.toFixed(1)}%`}var rt=null;function ft(){return rt||(rt=new Promise(t=>{if(window.Chart){t();return}let e=document.createElement("script");e.src="https://cdn.jsdelivr.net/npm/chart.js@latest/dist/chart.umd.min.js",e.onload=t,e.onerror=t,document.body.appendChild(e)}),rt)}function yt(t,e){return`
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

        </div>`}async function Oe(t){await ft();let e;try{e=await p.get(`/sites/${t}/stats/traffic`)}catch(n){document.getElementById("stats-ip-rows").innerHTML=`<tr><td colspan="2" class="kp-muted uk-text-small">Failed to load: ${n.message}</td></tr>`;return}document.getElementById("stats-2xx").textContent=(e.status_codes["2xx"]??0).toLocaleString(),document.getElementById("stats-3xx").textContent=(e.status_codes["3xx"]??0).toLocaleString(),document.getElementById("stats-4xx").textContent=(e.status_codes["4xx"]??0).toLocaleString(),document.getElementById("stats-5xx").textContent=(e.status_codes["5xx"]??0).toLocaleString(),document.getElementById("stats-bandwidth").textContent=L(e.total_bandwidth??0);let a=document.getElementById("stats-chart");if(a&&window.Chart){let n=(e.hits_per_hour??[]).map(l=>new Date(l.hour).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}));U&&(U.destroy(),U=null),U=new window.Chart(a,{type:"bar",data:{labels:n,datasets:[{label:"2xx",data:(e.hits_per_hour??[]).map(l=>l["2xx"]),backgroundColor:"rgba(39,174,96,0.75)",borderColor:"rgba(39,174,96,1)",borderWidth:1,borderRadius:3},{label:"3xx",data:(e.hits_per_hour??[]).map(l=>l["3xx"]),backgroundColor:"rgba(43,142,255,0.75)",borderColor:"rgba(43,142,255,1)",borderWidth:1,borderRadius:3},{label:"4xx",data:(e.hits_per_hour??[]).map(l=>l["4xx"]),backgroundColor:"rgba(255,171,0,0.75)",borderColor:"rgba(255,171,0,1)",borderWidth:1,borderRadius:3},{label:"5xx",data:(e.hits_per_hour??[]).map(l=>l["5xx"]),backgroundColor:"rgba(235,59,90,0.75)",borderColor:"rgba(235,59,90,1)",borderWidth:1,borderRadius:3}]},options:{responsive:!0,maintainAspectRatio:!1,onClick:(l,r)=>{if(!r||!r.length)return;let c=r[0].datasetIndex,h=U.data.datasets[c].label;if(h!=="4xx"&&h!=="5xx")return;let k=r[0].index,d=document.getElementById("stats-panel");if(!d||!d._hitsPerHour)return;let m=d._hitsPerHour[k]?.hour;m&&wt(`/sites/${t}/stats/drilldown`,m,h)},onHover:(l,r)=>{if(!r||!r.length){l.native.target.style.cursor="default";return}let c=U.data.datasets[r[0].datasetIndex].label;l.native.target.style.cursor=c==="4xx"||c==="5xx"?"pointer":"default"},plugins:{legend:{display:!0,labels:{color:"#6b8cae",font:{size:11}},onHover:l=>{l.native.target.style.cursor="pointer"},onLeave:l=>{l.native.target.style.cursor="default"}},tooltip:{mode:"index",backgroundColor:"#0c1530",borderColor:"#1a2a4a",borderWidth:1,titleColor:"#dde8f5",bodyColor:"#6b8cae"}},scales:{x:{stacked:!0,ticks:{color:"#6b8cae",font:{size:10},maxRotation:45},grid:{color:"rgba(26,42,74,0.6)"}},y:{stacked:!0,ticks:{color:"#6b8cae",font:{size:10}},grid:{color:"rgba(26,42,74,0.6)"},beginAtZero:!0}}}});let o=document.getElementById("stats-panel");o&&(o._hitsPerHour=e.hits_per_hour??[])}let s=document.getElementById("stats-ip-rows");s&&(s.innerHTML=(e.top_ips??[]).length===0?'<tr><td colspan="2" class="kp-muted uk-text-small">No data</td></tr>':(e.top_ips??[]).map(n=>`
                <tr>
                    <td class="kp-stats-table-cell-mono">${g(n.name)}</td>
                    <td class="kp-stats-table-cell-count">${n.count.toLocaleString()}</td>
                </tr>`).join(""));let i=document.getElementById("stats-ua-rows");i&&(i.innerHTML=(e.top_uas??[]).length===0?'<tr><td colspan="2" class="kp-muted uk-text-small">No data</td></tr>':(e.top_uas??[]).map(n=>`
                <tr>
                    <td class="kp-stats-ua-cell" title="${g(n.name)}">${g(n.name)}</td>
                    <td class="kp-stats-table-cell-count">${n.count.toLocaleString()}</td>
                </tr>`).join(""))}async function Ot(t){let e=document.getElementById("stats-disk-wrap");if(e){e.innerHTML='<div uk-spinner="ratio:0.8" style="color:var(--kp-blue)"></div>';try{let a=await p.get(`/sites/${t}/stats/disk`);e.innerHTML=`
            <div class="uk-grid-small uk-child-width-1-2" uk-grid>
                <div>
                    <div class="kp-stat-card" style="padding:16px">
                        <div class="kp-stat-value kp-stats-disk-val">${L(a.html_bytes??0)}</div>
                        <div class="kp-stat-label">Site Files</div>
                    </div>
                </div>
                <div>
                    <div class="kp-stat-card" style="padding:16px">
                        <div class="kp-stat-value kp-stats-disk-val">${L(a.db_bytes??0)}</div>
                        <div class="kp-stat-label">Database</div>
                    </div>
                </div>
            </div>`}catch(a){e.innerHTML=`<p class="kp-muted uk-text-small">Failed to load disk usage: ${a.message}</p>`}}}function ze(t){return!t||t.length===0?'<p class="kp-muted uk-text-small uk-margin-remove">No container data.</p>':`
        <table class="uk-table uk-table-small uk-table-divider uk-margin-remove">
            <thead><tr>
                <th style="color:var(--kp-text-dim);font-size:0.75rem">Container</th>
                <th style="color:var(--kp-text-dim);font-size:0.75rem">CPU</th>
                <th style="color:var(--kp-text-dim);font-size:0.75rem">Memory</th>
                <th style="color:var(--kp-text-dim);font-size:0.75rem">Mem %</th>
            </tr></thead>
            <tbody>${t.map(a=>{let s=a.mem_limit>0?(a.mem_used/a.mem_limit*100).toFixed(1):0,i=s>80,n=a.name.split("-").pop();return`
            <tr>
                <td class="kp-stats-pod-role kp-stats-pod-role-btn"
                    data-container="${a.name}"
                    title="Restart ${n}"
                    style="cursor:pointer">${n}</td>
                <td class="kp-stats-pod-cpu${a.cpu_percent>80?" is-hot":""}">
                    ${je(a.cpu_percent)}
                </td>
                <td class="kp-stats-pod-mem">
                    ${L(a.mem_used)}
                    <span class="kp-stats-pod-mem-limit"> / ${L(a.mem_limit)}</span>
                </td>
                <td>
                    <div class="kp-stats-mem-wrap">
                        <div class="kp-stats-mem-bar-track">
                            <div class="kp-stats-mem-bar-fill${i?" is-hot":""}"
                                style="width:${s}%"></div>
                        </div>
                        <span class="kp-stats-mem-pct">${s}%</span>
                    </div>
                </td>
            </tr>`}).join("")}</tbody>
        </table>`}function Ve(t,e,a,s,i){if(!t||t.length===0)return'<p class="kp-muted uk-text-small">No matching requests found.</p>';let n=[...t].sort((k,d)=>{let m,b;switch(a){case"time":m=k.time,b=d.time;break;case"method":m=k.method,b=d.method;break;case"site":m=k.site_name,b=d.site_name;break;case"ip":m=k.client_ip,b=d.client_ip;break;default:m=k.status,b=d.status;break}return m<b?s?1:-1:m>b?s?-1:1:0}),o=50,l=Math.ceil(n.length/o),c=n.slice(e*o,(e+1)*o).map(k=>{let d=g(k.ua),m=k.status>=500?"kp-badge-danger":"kp-badge-warning";return`
            <tr>
                <td class="kp-stats-table-cell-mono" style="white-space:nowrap">${k.time.slice(11,19)}</td>
                ${i?`<td class="kp-stats-table-cell-mono" style="font-size:0.8rem">${g(k.site_name)}</td>`:""}
                <td class="kp-stats-table-cell-mono">${g(k.method)}</td>
                <td style="word-break:break-all;font-size:0.8rem">${g(k.path)}</td>
                <td><span class="kp-badge ${m}">${k.status}</span>${k.reason?` <span class="kp-badge kp-badge-danger" style="font-size:0.65rem" uk-tooltip="Blocked by security rule">${g(k.reason)}</span>`:""}</td>
                <td class="kp-stats-table-cell-mono">${g(k.client_ip)}</td>
                <td class="kp-dd-ua-cell">${d}</td>
            </tr>`}).join(""),h=l>1?`
        <div class="uk-flex uk-flex-between uk-flex-middle uk-margin-small-top">
            <span class="kp-muted uk-text-small">Page ${e+1} of ${l} \u2014 ${t.length} total</span>
            <div>
                ${e>0?`<button class="uk-button kp-btn-ghost kp-btn-sm" data-dd-page="${e-1}">\u2039 Prev</button>`:""}
                ${e<l-1?`<button class="uk-button kp-btn-ghost kp-btn-sm" data-dd-page="${e+1}">Next \u203A</button>`:""}
            </div>
        </div>`:"";return`
        <div class="kp-table-wrap uk-overflow-auto">
            <table class="uk-table uk-table-small uk-table-divider uk-margin-remove">
                <thead><tr>
                    <th style="color:var(--kp-text-dim);font-size:0.75rem;cursor:pointer;user-select:none" data-dd-col="time">Time ${a==="time"?s?"\u2193":"\u2191":"\u2195"}</th>
                    ${i?`<th style="color:var(--kp-text-dim);font-size:0.75rem;cursor:pointer;user-select:none" data-dd-col="site">Site ${a==="site"?s?"\u2193":"\u2191":"\u2195"}</th>`:""}
                    <th style="color:var(--kp-text-dim);font-size:0.75rem;cursor:pointer;user-select:none" data-dd-col="method">Method ${a==="method"?s?"\u2193":"\u2191":"\u2195"}</th>
                    <th style="color:var(--kp-text-dim);font-size:0.75rem">Path</th>
                    <th style="color:var(--kp-text-dim);font-size:0.75rem;cursor:pointer;user-select:none" data-dd-col="status">Status ${a==="status"?s?"\u2193":"\u2191":"\u2195"}</th>
                    <th style="color:var(--kp-text-dim);font-size:0.75rem;cursor:pointer;user-select:none" data-dd-col="ip">IP ${a==="ip"?s?"\u2193":"\u2191":"\u2195"}</th>
                    <th style="color:var(--kp-text-dim);font-size:0.75rem">UA</th>
                </tr></thead>
                <tbody>${c}</tbody>
            </table>
        </div>
        ${h}`}async function wt(t,e,a,s=!1){let i=document.getElementById("stats-drilldown-modal"),n=document.getElementById("stats-drilldown-title"),o=document.getElementById("stats-drilldown-body");if(!i||!o)return;n.textContent=`${a} Requests \u2014 ${new Date(e).toLocaleString([],{hour:"2-digit",minute:"2-digit",month:"short",day:"numeric"})}`,o.innerHTML='<div uk-spinner="ratio:0.8" style="color:var(--kp-blue)"></div>',UIkit.modal(i).show();let l=[],r=0,c="time",h=!0;function k(){o.innerHTML=Ve(l,r,c,h,s),o.querySelectorAll("th[data-dd-col]").forEach(d=>{d.addEventListener("click",()=>{let m=d.dataset.ddCol;c===m?h=!h:(c=m,h=!0),r=0,k()})}),o.querySelectorAll("[data-dd-page]").forEach(d=>{d.addEventListener("click",()=>{r=parseInt(d.dataset.ddPage,10),k()})})}try{l=await p.get(`${t}?hour=${encodeURIComponent(e)}&status=${a}`)}catch(d){o.innerHTML=`<p class="kp-muted uk-text-small">Failed to load: ${g(d.message)}</p>`;return}k()}function xt(t,e,a){let s=a===6,i=null;function n(){if(s)return;let r=t.querySelector("#stats-pod-indicator"),c=t.querySelector("#stats-pod-table-wrap");if(!c)return;let h=location.protocol==="https:"?"wss":"ws";i=new WebSocket(`${h}://${location.host}/api/sites/${e}/stats/pod`),i.onopen=()=>{r&&(r.className="kp-status kp-status-running",r.textContent="Live")},i.onmessage=k=>{try{let d=JSON.parse(k.data);c.innerHTML=ze(d.containers??[]),c.querySelectorAll(".kp-stats-pod-role-btn").forEach(m=>{m.addEventListener("click",async()=>{let b=m.style.color;m.style.color="var(--kp-warning)";let v=m.dataset.container.split("-").pop();try{await p.post(`/sites/${e}/containers/${v}/restart`),u.success(`${v} restarted`)}catch(f){m.style.color=b,u.error(f.message)}})})}catch{}},i.onerror=()=>{r&&(r.className="kp-status kp-status-error",r.textContent="Error")},i.onclose=()=>{r&&r.textContent==="Live"&&(r.className="kp-status kp-status-stopped",r.textContent="Disconnected")}}function o(){i&&i.readyState===WebSocket.OPEN&&i.close(),i=null}t.querySelector("#stats-disk-refresh")?.addEventListener("click",()=>{Ot(e)}),n();let l=new MutationObserver(()=>{document.getElementById("stats-panel")||(o(),l.disconnect())});l.observe(document.getElementById("main")??document.body,{childList:!0,subtree:!1})}async function St(t,e){let a=e===6;await Oe(t),a||await Ot(t)}async function zt(t){let e=await p.get("/sites")??[];t.innerHTML=`
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

        ${e.length===0?st("world","No sites yet \u2014 create one to get started"):`<div class="kp-table-wrap">
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
                            ${e.map(a=>Ke(a,e)).join("")}
                        </tbody>
                    </table>
                </div>
            </div>`}`,document.getElementById("sites-new-btn").addEventListener("click",()=>lt()),Je()}function Ke(t,e=[]){let a=t.Domains?.[0]??null,s=t.SiteType===6,i=t.ParentID>0?e.find(n=>n.ID===t.ParentID)??null:null;return`
        <tr data-site-id="${t.ID}" data-status="${s?"":t.SiteStatus}" data-type="${t.SiteType}">
            <!-- row checkbox -->
            <td class="uk-table-shrink">
                <input class="uk-checkbox kp-site-row-check" type="checkbox"
                       data-site-id="${t.ID}" data-site-type="${t.SiteType}">
            </td>
            <!-- status badge -->
            <td class="uk-table-shrink kp-site-row-status">${s?"":M(t.SiteStatus)}</td>

            <!-- name + optional parent clone link -->
            <td>
                <a class="kp-site-row-name" href="javascript:void(0)"
                   data-action="manage" data-id="${t.ID}">${t.Name}</a>
                ${i?`<div class="kp-muted uk-text-small kp-mono">
                           <span uk-icon="icon: git-fork; ratio: 0.7"></span>
                           <a href="javascript:void(0)" data-action="manage" data-id="${i.ID}"
                              style="color:var(--kp-cyan)">${i.Name}</a>
                       </div>`:""}
            </td>

            <!-- type / runtime version -->
            <td class="uk-visible@s kp-muted kp-mono uk-text-small">
                ${J(t.SiteType)}${R(t)?" / "+R(t):""}
            </td>

            <!-- internal port -->
            <td class="uk-visible@m kp-muted kp-mono uk-text-small">:${t.Port}</td>

            <!-- host-mapped owner UID of html/ -->
            <td class="uk-visible@m kp-muted kp-mono uk-text-small">${t.HostUID??(s?"":"\u2014")}</td>

            <!-- primary domain -->
            <td class="uk-visible@m uk-text-small">
                ${a?`<a href="http://${a}" target="_blank"
                          style="color:var(--kp-cyan)">${a}</a>`:'<span class="kp-muted">\u2014</span>'}
            </td>

            <!-- action buttons -->
            <td class="uk-table-shrink">
                <div class="kp-site-row-actions">
                    <button class="uk-button kp-btn-secondary kp-btn-sm"
                            data-action="manage" data-id="${t.ID}"
                            uk-tooltip="Manage">
                        <span uk-icon="icon: cog;"></span>
                    </button>
                    ${s?"":`
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
        </tr>`}function Vt(t,e=[]){let a=t.Domains?.[0]??null,s=t.SiteType===6,i=t.ParentID>0?e.find(n=>n.ID===t.ParentID)??null:null;return`
        <div class="kp-site-card uk-margin" data-site-id="${t.ID}" data-status="${s?"":t.SiteStatus}" data-type="${t.SiteType}">
            <div class="kp-site-card-header">
                <div>
                    <h2 class="kp-view-title" data-action="manage" data-id="${t.ID}">${t.Name}</h2>
                    <div class="kp-site-meta">
                        <span class="kp-site-meta-item"><span uk-icon="icon: server; ratio: 0.75"></span> :${t.Port}</span>
                        <span class="kp-site-meta-item"><span uk-icon="icon: code; ratio: 0.75"></span> ${J(t.SiteType)}${R(t)?" / "+R(t):""}</span>
                        ${a?`<span class="kp-site-meta-item" style="width:100%"><a href="http://${a}" target="_blank" style="color:var(--kp-cyan)">${a}</a></span>`:""}
                    </div>
                    ${i?`<div class="kp-site-meta kp-muted uk-text-small uk-margin-small-top"><span uk-icon="icon: git-fork; ratio: 0.75"></span> <a href="javascript:void(0)" data-action="manage" data-id="${i.ID}" style="color:var(--kp-cyan)">${i.Name}</a></div>`:""}
                </div>
                ${s?"":M(t.SiteStatus)}
            </div>
            <div class="kp-site-actions">
                <button class="uk-button kp-btn-secondary kp-btn-sm" data-action="manage" data-id="${t.ID}" uk-tooltip="Manage This Site"><span uk-icon="icon: cog;"></span></button>
                ${s?"":`
                ${t.SiteStatus===1?`<button class="uk-button kp-btn-secondary kp-btn-sm" data-action="stop" data-id="${t.ID}" uk-tooltip="Stop the Site"><span uk-icon="icon: ban;"></span></button>`:`<button class="uk-button kp-btn-secondary kp-btn-sm" data-action="start" data-id="${t.ID}" uk-tooltip="Start the Site"><span uk-icon="icon: play;"></span></button>`}
                <button class="uk-button kp-btn-secondary kp-btn-sm" data-action="restart" data-id="${t.ID}" uk-tooltip="Restart the Site"><span uk-icon="icon: refresh;"></span></button>
                <button class="uk-button kp-btn-secondary kp-btn-sm" data-action="flush" data-id="${t.ID}" title="Flush cache" uk-tooltip="Flush the Caches"><span uk-icon="icon: bolt;"></span></button>
                <div class="kp-site-actions-break"></div>
                <button class="uk-button kp-btn-ghost kp-btn-sm" data-action="recreate" data-id="${t.ID}" title="Recreate pod" uk-tooltip="Recreate the Pod"><span uk-icon="icon: history;"></span></button>
                `}
                <button class="uk-button kp-btn-ghost kp-btn-sm" data-action="delete" data-id="${t.ID}" title="Delete" uk-tooltip="Delete the Site"><span uk-icon="icon: trash;"></span></button>
            </div>
        </div>`}function Je(){let t=document.getElementById("sites-bulk-bar"),e=document.getElementById("sites-bulk-count"),a=document.getElementById("sites-select-all"),s=document.getElementById("sites-search"),i=document.querySelector(".kp-table-wrap tbody");if(!t||!a)return;let n=null,o=!0,l=()=>[...document.querySelectorAll(".kp-site-row-check:checked")],r=()=>{let b=l().length;e.textContent=`${b} selected`,["bulk-start","bulk-stop","bulk-restart","bulk-flush","bulk-recreate"].forEach(w=>{let S=document.getElementById(w);S&&(S.disabled=b===0)});let v=document.getElementById("kp-bulk-mobile-btn");v&&(v.disabled=b===0);let f=document.querySelectorAll(".kp-site-row-check");a.indeterminate=b>0&&b<f.length,a.checked=f.length>0&&b===f.length},c=()=>{let m=s.value.trim().toLowerCase();document.querySelectorAll(".kp-table-wrap tbody tr").forEach(b=>{let v=b.querySelector(".kp-site-row-name")?.textContent.toLowerCase()??"",f=b.querySelector("td:nth-child(6)")?.textContent.toLowerCase()??"";b.style.display=!m||v.includes(m)||f.includes(m)?"":"none"})},h=m=>{n===m?o=!o:(n=m,o=!0),document.querySelectorAll(".kp-sort-icon").forEach(v=>{v.textContent=v.dataset.col===m?o?" \u2191":" \u2193":" \u2195"});let b=[...i.querySelectorAll("tr")];b.sort((v,f)=>{let w="",S="";return m==="name"?(w=v.querySelector(".kp-site-row-name")?.textContent??"",S=f.querySelector(".kp-site-row-name")?.textContent??""):m==="status"?(w=v.dataset.status??"",S=f.dataset.status??""):m==="type"?(w=v.dataset.type??"",S=f.dataset.type??""):m==="domain"&&(w=v.querySelector("td:nth-child(6)")?.textContent.trim()??"",S=f.querySelector("td:nth-child(6)")?.textContent.trim()??""),o?w.localeCompare(S):S.localeCompare(w)}),b.forEach(v=>i.appendChild(v))};a.addEventListener("change",()=>{document.querySelectorAll(".kp-site-row-check").forEach(m=>{m.checked=a.checked}),r()}),i?.addEventListener("change",m=>{m.target.classList.contains("kp-site-row-check")&&r()}),s?.addEventListener("input",c),document.querySelectorAll(".kp-sortable").forEach(m=>{m.addEventListener("click",()=>h(m.dataset.col))}),["bulk-start","bulk-stop","bulk-restart","bulk-flush","bulk-recreate"].forEach(m=>{let b=m.replace("bulk-","");document.getElementById(m)?.addEventListener("click",()=>{let v=l().filter(f=>f.dataset.siteType!=="6").map(f=>f.dataset.siteId);document.dispatchEvent(new CustomEvent("kp:bulk-action",{detail:{action:b,ids:v}}))})});let k=document.getElementById("kp-bulk-mobile-pill"),d=document.getElementById("kp-bulk-mobile-dropdown");document.getElementById("kp-bulk-mobile-btn")?.addEventListener("click",m=>{m.stopPropagation(),d.hidden=!d.hidden}),document.addEventListener("click",m=>{d&&!k?.contains(m.target)&&(d.hidden=!0)},{capture:!0}),["start","stop","restart","flush","recreate"].forEach(m=>{document.getElementById(`bulk-mobile-${m}`)?.addEventListener("click",b=>{b.preventDefault(),d.hidden=!0;let v=l().filter(f=>f.dataset.siteType!=="6").map(f=>f.dataset.siteId);document.dispatchEvent(new CustomEvent("kp:bulk-action",{detail:{action:m,ids:v}}))})}),document.querySelectorAll(".kp-sort-icon").forEach(m=>{m.textContent=" \u2195"}),r()}var N=null,W=null;function Ge(){W&&(W.close(),W=null);let t=(s,i)=>i>0?`${(s/i*100).toFixed(1)}%`:"\u2014",e=location.protocol==="https:"?"wss":"ws",a=new WebSocket(`${e}://${location.host}/api/stats/host`);W=a,a.onmessage=s=>{let i=document.getElementById("dash-host-cpu");if(!i){a.close();return}let n;try{n=JSON.parse(s.data)}catch{return}i.textContent=`${(n.cpu_percent??0).toFixed(1)}%`,document.getElementById("dash-host-mem").textContent=t(n.mem_used,n.mem_total),document.getElementById("dash-host-mem-sub").textContent=`${L(n.mem_used??0)} / ${L(n.mem_total??0)}`,document.getElementById("dash-host-disk").textContent=t(n.disk_used,n.disk_total),document.getElementById("dash-host-disk-sub").textContent=`${L(n.disk_used??0)} / ${L(n.disk_total??0)}`,document.getElementById("dash-host-procs").textContent=(n.procs_running??0).toLocaleString(),document.getElementById("dash-host-procs-sub").textContent=`of ${(n.procs_total??0).toLocaleString()} threads`},a.onclose=()=>{W===a&&(W=null)}}async function Kt(t){let[e,a]=await Promise.all([p.get("/sites").catch(()=>[]),p.get("/stats/traffic").catch(()=>null)]),s=e.filter(l=>l.SiteType!==6&&l.SiteStatus===1).length,i=e.filter(l=>l.SiteType===6).length,n=e.filter(l=>l.SiteType!==6&&l.SiteStatus===4).length,o=window.KP?.user?.role===99;if(t.innerHTML=`

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
                            <div class="kp-stat-value" style="color:var(--kp-success)">${s}</div>
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
                            <div class="kp-stat-value" style="color:var(--kp-cyan)">${i}</div>
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
        ${o?`
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
                        ${(a?.status_codes?.["2xx"]??0).toLocaleString()}
                    </div>
                    <div class="kp-stat-label" style="color:var(--kp-success)">2xx Success</div>
                </div></div>
                <div><div class="kp-stat-card" style="padding:16px">
                    <div class="kp-stat-value" style="font-size:1.6rem;color:var(--kp-cyan)">
                        ${(a?.status_codes?.["3xx"]??0).toLocaleString()}
                    </div>
                    <div class="kp-stat-label" style="color:var(--kp-cyan)">3xx Redirect</div>
                </div></div>
                <div><div class="kp-stat-card" style="padding:16px">
                    <div class="kp-stat-value" style="font-size:1.6rem;color:var(--kp-warning)">
                        ${(a?.status_codes?.["4xx"]??0).toLocaleString()}
                    </div>
                    <div class="kp-stat-label" style="color:var(--kp-warning)">4xx Client Err</div>
                </div></div>
                <div><div class="kp-stat-card" style="padding:16px">
                    <div class="kp-stat-value" style="font-size:1.6rem;color:var(--kp-danger)">
                        ${(a?.status_codes?.["5xx"]??0).toLocaleString()}
                    </div>
                    <div class="kp-stat-label" style="color:var(--kp-danger)">5xx Server Err</div>
                </div></div>
            </div>
            <div class="uk-margin-small-bottom" style="color:var(--kp-text-dim);font-size:0.85rem">
                Total Bandwidth:
                <span style="color:var(--kp-cyan);font-family:'JetBrains Mono',monospace">
                    ${L(a?.total_bandwidth??0)}
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
                    ${e.length===0?emptyState("world","No sites yet"):e.slice(-3).reverse().map(l=>Vt(l,e)).join("")}
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
                            ${(a?.top_sites??[]).length===0?'<tr><td colspan="2" class="kp-muted uk-text-small">No traffic data</td></tr>':(a?.top_sites??[]).map(l=>`
                                    <tr>
                                        <td class="kp-mono" style="font-size:0.8rem">${g(l.name)}</td>
                                        <td style="text-align:right;color:var(--kp-cyan);
                                            font-family:'JetBrains Mono',monospace;font-size:0.8rem">
                                            ${l.count.toLocaleString()}
                                        </td>
                                    </tr>`).join("")}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        `,o&&Ge(),a?.hits_per_hour?.length){await ft();let l=document.getElementById("dash-traffic-chart");l&&window.Chart&&(N&&(N.destroy(),N=null),N=new window.Chart(l,{type:"bar",data:{labels:a.hits_per_hour.map(r=>new Date(r.hour).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})),datasets:[{label:"2xx",data:a.hits_per_hour.map(r=>r["2xx"]),backgroundColor:"rgba(39,174,96,0.75)",borderColor:"rgba(39,174,96,1)",borderWidth:1,borderRadius:3},{label:"3xx",data:a.hits_per_hour.map(r=>r["3xx"]),backgroundColor:"rgba(43,142,255,0.75)",borderColor:"rgba(43,142,255,1)",borderWidth:1,borderRadius:3},{label:"4xx",data:a.hits_per_hour.map(r=>r["4xx"]),backgroundColor:"rgba(255,171,0,0.75)",borderColor:"rgba(255,171,0,1)",borderWidth:1,borderRadius:3},{label:"5xx",data:a.hits_per_hour.map(r=>r["5xx"]),backgroundColor:"rgba(235,59,90,0.75)",borderColor:"rgba(235,59,90,1)",borderWidth:1,borderRadius:3}]},options:{responsive:!0,maintainAspectRatio:!1,onClick:(r,c)=>{if(!c||!c.length)return;let h=c[0].datasetIndex,k=N.data.datasets[h].label;if(k!=="4xx"&&k!=="5xx")return;let d=a.hits_per_hour[c[0].index]?.hour;d&&wt("/stats/drilldown",d,k,!0)},onHover:(r,c)=>{if(!c||!c.length){r.native.target.style.cursor="default";return}let h=N.data.datasets[c[0].datasetIndex].label;r.native.target.style.cursor=h==="4xx"||h==="5xx"?"pointer":"default"},plugins:{legend:{display:!0,labels:{color:"#6b8cae",font:{size:11}},onHover:r=>{r.native.target.style.cursor="pointer"},onLeave:r=>{r.native.target.style.cursor="default"}},tooltip:{mode:"index",backgroundColor:"#0c1530",borderColor:"#1a2a4a",borderWidth:1,titleColor:"#dde8f5",bodyColor:"#6b8cae"}},scales:{x:{stacked:!0,ticks:{color:"#6b8cae",font:{size:10},maxRotation:45},grid:{color:"rgba(26,42,74,0.6)"}},y:{stacked:!0,ticks:{color:"#6b8cae",font:{size:10}},grid:{color:"rgba(26,42,74,0.6)"},beginAtZero:!0}}}}))}document.getElementById("dash-new-site")?.addEventListener("click",()=>lt())}function G(t=null){let e=t?`/sites/${t}/security/ip`:"/security/ip",a=t?`/sites/${t}/security/ua`:"/security/ua",s=t?`/sites/${t}/security/country`:"/security/country",i=t?`/sites/${t}/security/asn`:"/security/asn";return`
        <div id="security-panel" data-ip-base="${e}" data-ua-base="${a}" data-geo-base="${s}" data-asn-base="${i}" ${t?`data-site-id="${t}"`:""}>

            <!-- tab pills -->
            <ul class="kp-tab-pills" id="kp-sec-pills">
                <li data-tab="ip"><a href="#"><span uk-icon="icon: location; ratio: 0.85"></span> IP Rules</a></li>
                <li data-tab="ua"><a href="#"><span uk-icon="icon: laptop; ratio: 0.85"></span> User-Agent</a></li>
                <li data-tab="country"><a href="#"><span uk-icon="icon: world; ratio: 0.85"></span> Country</a></li>
                <li data-tab="asn"><a href="#"><span uk-icon="icon: server; ratio: 0.85"></span> ASN</a></li>
                ${t?"":`
                <li data-tab="proxies"><a href="#"><span uk-icon="icon: link; ratio: 0.85"></span> Trusted Proxies</a></li>
                <li data-tab="bypass"><a href="#"><span uk-icon="icon: unlock; ratio: 0.85"></span> Bypass</a></li>
                `}
            </ul>

            <!-- switcher panels -->
            <ul class="uk-switcher uk-margin-large-bottom" id="kp-sec-switcher">

                <!-- ip rules -->
                <li>
                    <p class="kp-muted uk-text-small uk-margin-small-bottom">
                        <span uk-icon="icon: warning; ratio: 0.75"></span>
                        The Spamhaus DROP lists are enforced alongside these rules on every
                        request. Whitelist an IP here to allow it through regardless.
                        <a href="https://www.spamhaus.org/blocklists/do-not-route-or-peer/" target="_blank" rel="noopener">
                            About Spamhaus DROP
                        </a>
                    </p>
                    <div class="kp-card uk-padding-small">
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
                </li>

                <!-- user-agent rules -->
                <li>
                    <div class="kp-card uk-padding-small">
                        <div class="uk-flex uk-flex-between uk-flex-middle uk-margin-small-bottom">
                            <h3 class="kp-view-title">User-Agent Rules</h3>
                            <div class="uk-flex" style="gap:8px">
                                <a class="uk-button kp-btn-ghost kp-btn-sm" href="/api${a}/export" download="${t?`site-${t}-ua-rules.csv`:"podnest-global-ua-rules.csv"}" uk-tooltip="Export UA rules as CSV">
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
                </li>

                <!-- country rules -->
                <li>
                    <div class="kp-card uk-padding-small">
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
                </li>

                <!-- asn rules -->
                <li>
                    <div class="kp-card uk-padding-small">
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
                </li>

                ${t?"":`
                <!-- trusted proxy ranges -->
                <li>
                    <div class="kp-card uk-padding-small">
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
                </li>

                <!-- security bypass -->
                <li>
                    <div class="kp-card uk-padding-small">
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
                </li>
                `}

            </ul>
        </div>`}function ct(t,e){let a=t.querySelector("#security-panel"),s=t.querySelector("#kp-sec-pills"),i=t.querySelector("#kp-sec-switcher");if(!a||!s||!i)return;let n=a.dataset.siteId,o=[...s.querySelectorAll(":scope > li")],l=(r,c)=>{if(UIkit.switcher(i).show(r),o.forEach((k,d)=>k.classList.toggle("kp-pill-active",d===r)),!c)return;let h=o[r].dataset.tab;history.replaceState(null,"",n?`#site-detail/${n}/${h}`:r===0?"#security":`#security/${h}`)};o.forEach((r,c)=>{r.querySelector(":scope > a").addEventListener("click",h=>{h.preventDefault(),l(c,!0)})}),l(Math.max(0,o.findIndex(r=>r.dataset.tab===e)),!1)}async function H(t){let e=t.querySelector("#security-panel");if(!e)return;let a=e.dataset.ipBase,s=e.dataset.uaBase;try{let i=e.dataset.geoBase,n=e.dataset.asnBase,o=[p.get(a),p.get(s),p.get(i),p.get(n)];e.dataset.siteId||o.push(p.get("/settings/trusted-proxies"),p.get("/security/bypass"));let[l,r,c,h,k,d]=await Promise.all(o);if(!t.querySelector("#sec-ip-whitelist"))return;if(t.querySelector("#sec-ip-whitelist").value=l.whitelist??"",t.querySelector("#sec-ip-blacklist").value=l.blacklist??"",t.querySelector("#sec-ua-whitelist").value=r.whitelist??"",t.querySelector("#sec-ua-blacklist").value=r.blacklist??"",t.querySelector("#sec-geo-whitelist").value=c.whitelist??"",t.querySelector("#sec-geo-blacklist").value=c.blacklist??"",t.querySelector("#sec-asn-whitelist").value=h.whitelist??"",t.querySelector("#sec-asn-blacklist").value=h.blacklist??"",k){let m=t.querySelector("#sec-tp-cidrs");m&&(m.value=k.trusted_proxies_custom??"")}if(d){let m=t.querySelector("#sec-bypass-cidrs");m&&(m.value=d.bypass??"")}}catch(i){u.error("Failed to load security rules: "+i.message)}}function dt(t){let e=t.querySelector("#security-panel");if(!e)return;let a=e.dataset.ipBase,s=e.dataset.uaBase,i=e.dataset.geoBase;t.querySelector("#sec-ip-save")?.addEventListener("click",async()=>{let n=t.querySelector("#sec-ip-save"),o=n.innerHTML;n.disabled=!0,n.innerHTML='<div uk-spinner="ratio: 0.5"></div>';try{await p.put(a,{whitelist:t.querySelector("#sec-ip-whitelist").value,blacklist:t.querySelector("#sec-ip-blacklist").value}),u.success("IP rules saved")}catch(l){u.error(l.message)}finally{n.disabled=!1,n.innerHTML=o}}),t.querySelector("#sec-ua-save")?.addEventListener("click",async()=>{let n=t.querySelector("#sec-ua-save"),o=n.innerHTML;n.disabled=!0,n.innerHTML='<div uk-spinner="ratio: 0.5"></div>';try{await p.put(s,{whitelist:t.querySelector("#sec-ua-whitelist").value,blacklist:t.querySelector("#sec-ua-blacklist").value}),u.success("UA rules saved")}catch(l){u.error(l.message)}finally{n.disabled=!1,n.innerHTML=o}}),t.querySelector("#sec-geo-save")?.addEventListener("click",async()=>{let n=t.querySelector("#sec-geo-save"),o=n.innerHTML;n.disabled=!0,n.innerHTML='<div uk-spinner="ratio: 0.5"></div>';try{let l={whitelist:t.querySelector("#sec-geo-whitelist").value,blacklist:t.querySelector("#sec-geo-blacklist").value},r=await p.put(i,l);r?.status==="confirm"&&(await UIkit.modal.confirm(`${r.reason}. Save anyway?`),r=await p.put(i,{...l,confirm:!0})),u.success("Country rules saved")}catch(l){l instanceof Error&&u.error(l.message)}finally{n.disabled=!1,n.innerHTML=o}}),t.querySelector("#sec-asn-save")?.addEventListener("click",async()=>{let n=t.querySelector("#sec-asn-save"),o=n.innerHTML;n.disabled=!0,n.innerHTML='<div uk-spinner="ratio: 0.5"></div>';try{let l=t.querySelector("#security-panel").dataset.asnBase,r={whitelist:t.querySelector("#sec-asn-whitelist").value,blacklist:t.querySelector("#sec-asn-blacklist").value},c=await p.put(l,r);c?.status==="confirm"&&(await UIkit.modal.confirm(`${c.reason}. Save anyway?`),c=await p.put(l,{...r,confirm:!0})),u.success("ASN rules saved")}catch(l){l instanceof Error&&u.error(l.message)}finally{n.disabled=!1,n.innerHTML=o}}),t.querySelector("#sec-asn-lookup")?.addEventListener("click",()=>Xe(t)),t.querySelector("#sec-tp-save")?.addEventListener("click",async()=>{let n=t.querySelector("#sec-tp-save"),o=n.innerHTML;n.disabled=!0,n.innerHTML='<div uk-spinner="ratio: 0.5"></div>';try{await p.put("/settings/trusted-proxies",{trusted_proxies_custom:t.querySelector("#sec-tp-cidrs").value.trim()}),u.success("Trusted proxy ranges saved")}catch(l){u.error(l.message)}finally{n.disabled=!1,n.innerHTML=o}}),t.querySelector("#sec-bypass-save")?.addEventListener("click",async()=>{let n=t.querySelector("#sec-bypass-save"),o=n.innerHTML;n.disabled=!0,n.innerHTML='<div uk-spinner="ratio: 0.5"></div>';try{await p.put("/security/bypass",{bypass:t.querySelector("#sec-bypass-cidrs").value.trim()}),u.success("Bypass rules saved")}catch(l){u.error(l.message)}finally{n.disabled=!1,n.innerHTML=o}}),t.querySelector("#sec-tp-import")?.addEventListener("change",async n=>{let o=n.target.files[0];if(!o)return;let l=new FormData;l.append("file",o);try{let r=await fetch("/api/settings/trusted-proxies/import",{method:"POST",headers:{"X-CSRF-Token":window.KP?.csrf??""},body:l}),c=r.status===204?null:await r.json().catch(()=>null);if(!r.ok)throw new Error(c?.error||`HTTP ${r.status}`);await H(t),u.success("Trusted proxies imported")}catch(r){u.error(r.message)}finally{n.target.value=""}}),t.querySelector("#sec-ip-import")?.addEventListener("change",async n=>{let o=n.target.files[0];if(!o)return;let l=new FormData;l.append("file",o);try{let r=await fetch("/api"+a+"/import",{method:"POST",headers:{"X-CSRF-Token":window.KP?.csrf??""},body:l}),c=r.status===204?null:await r.json().catch(()=>null);if(!r.ok)throw new Error(c?.error||`HTTP ${r.status}`);await H(t),u.success("IP rules imported")}catch(r){u.error(r.message)}finally{n.target.value=""}}),t.querySelector("#sec-ua-import")?.addEventListener("change",async n=>{let o=n.target.files[0];if(!o)return;let l=new FormData;l.append("file",o);try{let r=await fetch("/api"+s+"/import",{method:"POST",headers:{"X-CSRF-Token":window.KP?.csrf??""},body:l}),c=r.status===204?null:await r.json().catch(()=>null);if(!r.ok)throw new Error(c?.error||`HTTP ${r.status}`);await H(t),u.success("UA rules imported")}catch(r){u.error(r.message)}finally{n.target.value=""}})}function Xe(t){document.getElementById("kp-asn-lookup-modal")?.remove(),document.body.insertAdjacentHTML("beforeend",`
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
        </div>`);let a=UIkit.modal("#kp-asn-lookup-modal");a.show();let s=async()=>{let i=document.getElementById("asn-lookup-q").value.trim();if(!i)return;let n=document.getElementById("asn-lookup-result");n.innerHTML='<div uk-spinner="ratio: 0.5"></div>';try{let o=await p.get(`/security/asn/lookup?q=${encodeURIComponent(i)}`);if(!o?.asn){n.innerHTML='<p class="kp-muted uk-text-small">No ASN found for <span class="kp-mono"></span>.</p>',n.querySelector(".kp-mono").textContent=o?.ip||i;return}n.innerHTML=`
                <p class="uk-text-small">
                    <span class="kp-mono" id="asn-lookup-ip"></span> \u2192
                    <span class="kp-mono">AS${o.asn}</span>
                    <span id="asn-lookup-org"></span>
                    ${o.country?`<span class="kp-muted">(${o.country})</span>`:""}
                </p>
                <button class="uk-button kp-btn-ghost kp-btn-sm" id="asn-lookup-add">
                    <span uk-icon="ban"></span> Add AS${o.asn} to blacklist
                </button>`,n.querySelector("#asn-lookup-ip").textContent=o.ip,n.querySelector("#asn-lookup-org").textContent=o.org||"",n.querySelector("#asn-lookup-add").addEventListener("click",()=>{let l=t.querySelector("#sec-asn-blacklist"),r=`AS${o.asn}`;l.value.split(`
`).some(c=>c.trim().toUpperCase()===r)||(l.value=l.value.trim()?`${l.value.replace(/\s+$/,"")}
${r}`:r),a.hide(),u.success(`${r} added to blacklist \u2014 save to apply`)})}catch(o){n.innerHTML="",u.error(o.message)}};document.getElementById("asn-lookup-go").addEventListener("click",s),document.getElementById("asn-lookup-q").addEventListener("keydown",i=>{i.key==="Enter"&&s()})}async function Jt(t,e={}){if(!P()){t.innerHTML=T("Access denied");return}t.innerHTML=`
        <div class="kp-view-header">
            <h1 class="kp-view-title kp-cursor" style="font-size:2rem;">Global Security</h1>
        </div>
        <p class="kp-muted uk-text-small uk-margin-bottom">
            Global rules apply to all sites before per-site rules are evaluated.
            Blacklist always wins \u2014 except for IP rules, where a whitelist match
            in either scope allows the request outright.
        </p>
        ${G(null)}`,dt(t),ct(t,e.tab),H(t)}function Qe(t){switch(t){case"valid":return'<span class="kp-ssl-valid" uk-icon="icon: lock; ratio: 0.85" uk-tooltip="Valid SSL certificate"></span>';case"self-signed":return'<span class="kp-ssl-self-signed" uk-icon="icon: lock; ratio: 0.85" uk-tooltip="Self-signed certificate"></span>';case"expired":return'<span class="kp-ssl-none" uk-icon="icon: warning; ratio: 0.85" uk-tooltip="Expired certificate"></span>';case"mismatch":return'<span class="kp-ssl-none" uk-icon="icon: warning; ratio: 0.85" uk-tooltip="Certificate does not match this domain"></span>';default:return'<span class="kp-ssl-none" uk-icon="icon: warning; ratio: 0.85" uk-tooltip="No SSL certificate"></span>'}}async function Gt(t){let e=document.getElementById("admin-domain-ssl");if(!(!e||!t))try{let a=await p.get(`/ssl-status?domain=${encodeURIComponent(t)}`);e.outerHTML=Qe(a.status)}catch{}}var Xt=["general","backups","notifications"];function $t(t){return`
        <div class="uk-flex" style="gap:8px">
            <a class="uk-button kp-btn-ghost kp-btn-sm" href="/api/settings/export?group=${t}" download="podnest-settings-${t}.csv" uk-tooltip="Export these settings">
                <span uk-icon="download"></span>
            </a>
            <label class="uk-button kp-btn-ghost kp-btn-sm" style="cursor:pointer" uk-tooltip="Import these settings from CSV">
                <span uk-icon="upload"></span>
                <input type="file" class="kp-settings-import" data-group="${t}" accept=".csv" style="display:none">
            </label>
        </div>`}async function Et(t,e={}){if(!P()){t.innerHTML=T("Access denied");return}let[a,s,i,n]=await Promise.all([p.get("/settings"),p.get("/settings/backup"),p.get("/settings/notifications"),p.get("/settings/resources")]);t.innerHTML=`
    <div class="kp-view-header">
        <h1 class="kp-view-title kp-cursor" style="font-size:2rem;">Settings</h1>
    </div>

    <!-- tab pills -->
    <ul class="kp-tab-pills" id="kp-settings-pills">
        <li data-pill="0"><a href="#"><span uk-icon="icon: cog; ratio: 0.85"></span> General</a></li>
        <li data-pill="1"><a href="#"><span uk-icon="icon: cloud-upload; ratio: 0.85"></span> Backups</a></li>
        <li data-pill="2"><a href="#"><span uk-icon="icon: bell; ratio: 0.85"></span> Notifications</a></li>
    </ul>

    <!-- switcher panels -->
    <ul class="uk-switcher uk-margin-large-bottom" id="kp-settings-switcher">

        <!-- general: panel configuration + host resource watcher -->
        <li>
            <div class="kp-card uk-padding">
                <div class="uk-flex uk-flex-right uk-margin-bottom">
                    ${$t("general")}
                </div>
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
                                value="${a.admin_domain??""}">
                        </div>
                        <p class="kp-muted uk-text-small uk-margin-small-top">
                            When set, the proxy will route this domain to the management UI and issue
                            a Let's Encrypt certificate automatically. Leave blank to disable.
                        </p>
                    </div>

                    <h3 class="kp-view-title uk-margin-bottom uk-margin-top">Host Resource Watcher</h3>
                    <div class="uk-grid-small uk-child-width-1-2@m" uk-grid>
                        <div>
                            <label class="kp-label" for="resource-ram-reserve">RAM Reserve (GB)</label>
                            <input class="uk-input kp-input" id="resource-ram-reserve" name="resource_ram_reserve_gb" type="number"
                                min="0.5" max="64" step="0.5" placeholder="2"
                                value="${n.resource_ram_reserve_gb??"2"}">
                            <p class="kp-muted uk-text-small uk-margin-small-top">
                                Amount of RAM to keep free for the host OS. Throttling fires when aggregate pod usage exceeds total RAM minus this value.
                            </p>
                        </div>
                        <div>
                            <label class="kp-label" for="resource-poll-interval">Poll Interval (seconds)</label>
                            <input class="uk-input kp-input" id="resource-poll-interval" name="resource_poll_interval" type="number"
                                min="5" max="300" step="5" placeholder="30"
                                value="${n.resource_poll_interval??"30"}">
                        </div>
                        <div>
                            <label class="kp-label" for="resource-throttle-pct">Throttle Aggressiveness (%)</label>
                            <input class="uk-input kp-input" id="resource-throttle-pct" name="resource_throttle_pct" type="number"
                                min="10" max="90" step="5" placeholder="50"
                                value="${n.resource_throttle_pct??"50"}">
                            <p class="kp-muted uk-text-small uk-margin-small-top">
                                Percentage to reduce the offending pod's current memory usage by when throttling.
                            </p>
                        </div>
                        <div>
                            <label class="kp-label" for="shutdown-job-timeout">Shutdown Job Drain (minutes)</label>
                            <input class="uk-input kp-input" id="shutdown-job-timeout" name="shutdown_job_timeout" type="number"
                                min="1" max="60" step="1" placeholder="5"
                                value="${n.shutdown_job_timeout??"5"}">
                            <p class="kp-muted uk-text-small uk-margin-small-top">
                                How long to wait for in-flight backups, restores, and imports to finish before the process exits on stop or restart.
                            </p>
                        </div>
                        <div class="uk-width-1-1">
                            <label class="kp-label" for="resource-webhook-url">Webhook URL <span class="kp-muted">(optional)</span></label>
                            <input class="uk-input kp-input kp-mono" id="resource-webhook-url" name="resource_webhook_url" type="url"
                                placeholder="https://hooks.example.com/notify"
                                value="${n.resource_webhook_url??""}">
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
        </li>

        <!-- backups: schedule/retention + S3 storage -->
        <li>
            <div class="kp-card uk-padding">
                <div class="uk-flex uk-flex-right uk-margin-bottom">
                    ${$t("backups")}
                </div>
                <form id="backup-form" class="uk-form-stacked">
                    <div class="uk-grid-medium uk-child-width-1-2@m" uk-grid>
                        <div>
                            <h4 class="kp-view-title uk-margin-bottom">Schedule</h4>
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
                        </div>
                        <div>
                            <h4 class="kp-view-title uk-margin-bottom">S3 Storage</h4>
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
                        </div>
                    </div>
                    <div class="uk-flex uk-flex-right uk-margin-top">
                        <button type="submit" class="uk-button kp-btn-primary">
                            <span uk-icon="check"></span> Save Settings
                        </button>
                    </div>
                </form>
            </div>
        </li>

        <!-- notifications: smtp + aws sns -->
        <li>
            <div class="kp-card uk-padding">
                <div class="uk-flex uk-flex-right uk-flex-middle uk-margin-bottom">
                    ${$t("notifications")}
                </div>
                <form id="notifications-form" class="uk-form-stacked">
                    <div class="uk-grid-medium uk-child-width-1-2@m" uk-grid>
                        <div>
                            <h4 class="kp-view-title uk-margin-bottom">Email (SMTP)</h4>
                            <div class="uk-margin">
                                <label class="kp-label" for="smtp-host">SMTP Host</label>
                                <input class="uk-input kp-input kp-mono" id="smtp-host" name="smtp_host" type="text"
                                    placeholder="smtp.example.com" value="${i.smtp_host??""}">
                            </div>
                            <div class="uk-margin">
                                <label class="kp-label" for="smtp-port">Port</label>
                                <input class="uk-input kp-input kp-mono" id="smtp-port" name="smtp_port" type="text"
                                    placeholder="587" value="${i.smtp_port??""}">
                            </div>
                            <div class="uk-margin">
                                <label class="kp-label" for="smtp-username">Username</label>
                                <input class="uk-input kp-input kp-mono" id="smtp-username" name="smtp_username" type="text"
                                    placeholder="user@example.com" value="${i.smtp_username??""}">
                            </div>
                            <div class="uk-margin">
                                <label class="kp-label" for="smtp-password">Password</label>
                                <input class="uk-input kp-input kp-mono" id="smtp-password" name="smtp_password" type="password"
                                    placeholder="${i.smtp_password?"saved \u2014 enter new value to change":"enter password"}"
                                    value="">
                                <p class="kp-muted uk-text-small uk-margin-small-top">Leave blank to keep the existing password.</p>
                            </div>
                            <div class="uk-margin">
                                <label class="kp-label" for="smtp-from">From Address</label>
                                <input class="uk-input kp-input kp-mono" id="smtp-from" name="smtp_from" type="email"
                                    placeholder="podnest@example.com" value="${i.smtp_from??""}">
                            </div>
                            <div class="uk-margin">
                                <label class="kp-label">
                                    <input class="uk-checkbox" type="checkbox" id="smtp-tls" name="smtp_tls"
                                        ${i.smtp_tls==="true"||i.smtp_tls==="1"?"checked":""}>
                                    &nbsp;Use implicit TLS (port 465)
                                </label>
                                <p class="kp-muted uk-text-small uk-margin-small-top">
                                    Unchecked uses STARTTLS (port 587). Check only for port 465 / SSL-only servers.
                                </p>
                            </div>
                        </div>
                        <div>
                            <h4 class="kp-view-title uk-margin-bottom">SMS (AWS SNS)</h4>
                            <div class="uk-margin">
                                <label class="kp-label" for="aws-access-key">Access Key ID</label>
                                <input class="uk-input kp-input kp-mono" id="aws-access-key" name="aws_access_key" type="text"
                                    placeholder="AKIAIOSFODNN7EXAMPLE" value="${i.aws_access_key??""}">
                            </div>
                            <div class="uk-margin">
                                <label class="kp-label" for="aws-secret-key">Secret Access Key</label>
                                <input class="uk-input kp-input kp-mono" id="aws-secret-key" name="aws_secret_key" type="password"
                                    placeholder="${i.aws_secret_key?"saved \u2014 enter new value to change":"enter secret key"}"
                                    value="">
                                <p class="kp-muted uk-text-small uk-margin-small-top">Leave blank to keep the existing key.</p>
                            </div>
                            <div class="uk-margin">
                                <label class="kp-label" for="aws-region">AWS Region</label>
                                <input class="uk-input kp-input kp-mono" id="aws-region" name="aws_region" type="text"
                                    placeholder="us-east-1" value="${i.aws_region??""}">
                            </div>
                            <div class="uk-margin">
                                <label class="kp-label" for="aws-sns-sender-id">Sender ID <span class="kp-muted">(optional)</span></label>
                                <input class="uk-input kp-input kp-mono" id="aws-sns-sender-id" name="aws_sns_sender_id" type="text"
                                    placeholder="PodNest" value="${i.aws_sns_sender_id??""}">
                                <p class="kp-muted uk-text-small uk-margin-small-top">
                                    Alphanumeric sender name shown on the recipient's phone. Supported in select AWS regions only.
                                </p>
                            </div>
                        </div>
                    </div>
                    <div class="uk-flex uk-flex-right uk-margin-top">
                        <button type="submit" class="uk-button kp-btn-primary">
                            <span uk-icon="check"></span> Save Settings
                        </button>
                    </div>
                </form>
            </div>
        </li>
    </ul>
    `;let o=t.querySelector("#kp-settings-pills"),l=t.querySelector("#kp-settings-switcher"),r=c=>{UIkit.switcher(l).show(c),o.querySelectorAll(":scope > li").forEach((h,k)=>h.classList.toggle("kp-pill-active",k===c)),history.replaceState(null,"",c===0?"#settings":`#settings/${Xt[c]}`)};o.querySelectorAll(":scope > li > a").forEach(c=>{c.addEventListener("click",h=>{h.preventDefault(),r(parseInt(c.closest("li").dataset.pill,10))})}),r(Math.max(0,Xt.indexOf(e.tab))),a.admin_domain&&Gt(a.admin_domain),t.querySelectorAll(".kp-settings-import").forEach(c=>{c.addEventListener("change",async h=>{let k=h.target.files[0];if(!k)return;let d=h.target.dataset.group,m=new FormData;m.append("file",k);try{let b=await fetch(`/api/settings/import?group=${encodeURIComponent(d)}`,{method:"POST",headers:{"X-CSRF-Token":window.KP?.csrf??""},body:m}),v=b.status===204?null:await b.json().catch(()=>null);if(!b.ok)throw new Error(v?.error||`HTTP ${b.status}`);u.success("Settings imported"),await Et(t,{tab:d})}catch(b){u.error(b.message)}finally{h.target.value=""}})}),document.getElementById("settings-form").addEventListener("submit",async c=>{c.preventDefault();let h=c.target.querySelector('[type="submit"]'),k=h.innerHTML;h.disabled=!0,h.innerHTML='<div uk-spinner="ratio: 0.6"></div> Saving...';let d=new FormData(c.target),m={admin_domain:d.get("admin_domain").trim()},b={resource_ram_reserve_gb:d.get("resource_ram_reserve_gb").trim(),resource_poll_interval:d.get("resource_poll_interval").trim(),resource_throttle_pct:d.get("resource_throttle_pct").trim(),resource_webhook_url:d.get("resource_webhook_url").trim(),shutdown_job_timeout:d.get("shutdown_job_timeout").trim()};try{await p.put("/settings",m),await p.put("/settings/resources",b),u.success("Settings saved"),Gt(m.admin_domain)}catch(v){u.error(v.message)}finally{h.disabled=!1,h.innerHTML=k}}),document.getElementById("backup-form").addEventListener("submit",async c=>{c.preventDefault();let h=c.target.querySelector('[type="submit"]'),k=h.innerHTML;h.disabled=!0,h.innerHTML='<div uk-spinner="ratio: 0.6"></div> Saving...';let d=new FormData(c.target),m={backup_schedule:d.get("backup_schedule").trim(),backup_retain_days:d.get("backup_retain_days").trim(),s3_endpoint:d.get("s3_endpoint").trim(),s3_bucket:d.get("s3_bucket").trim(),s3_region:d.get("s3_region").trim(),s3_access_key:d.get("s3_access_key").trim()},b=d.get("s3_secret_key").trim();b&&(m.s3_secret_key=b);try{await p.put("/settings/backup",m),u.success("Backup settings saved")}catch(v){u.error(v.message)}finally{h.disabled=!1,h.innerHTML=k}}),document.getElementById("notifications-form").addEventListener("submit",async c=>{c.preventDefault();let h=c.target.querySelector('[type="submit"]'),k=h.innerHTML;h.disabled=!0,h.innerHTML='<div uk-spinner="ratio: 0.6"></div> Saving...';let d=new FormData(c.target),m={smtp_host:d.get("smtp_host").trim(),smtp_port:d.get("smtp_port").trim(),smtp_username:d.get("smtp_username").trim(),smtp_from:d.get("smtp_from").trim(),smtp_tls:d.get("smtp_tls")?"true":"false",aws_access_key:d.get("aws_access_key").trim(),aws_region:d.get("aws_region").trim(),aws_sns_sender_id:d.get("aws_sns_sender_id").trim()},b=d.get("smtp_password").trim();b&&(m.smtp_password=b);let v=d.get("aws_secret_key").trim();v&&(m.aws_secret_key=v);try{await p.put("/settings/notifications",m),u.success("Notification settings saved")}catch(f){u.error(f.message)}finally{h.disabled=!1,h.innerHTML=k}})}async function Qt(t){let e=`
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
        </div>`;document.body.insertAdjacentHTML("beforeend",e);let a=UIkit.modal("#kp-edit-site-modal"),s=document.getElementById("es-site-type"),i=document.getElementById("es-php-version-wrap"),n=document.getElementById("es-node-version-wrap"),o=document.getElementById("es-dotnet-version-wrap"),l=document.getElementById("es-python-version-wrap"),r=document.getElementById("es-start-command-wrap"),c=document.getElementById("es-wordpress-wrap");a.show();let h=k=>{i.classList.toggle("uk-hidden",k!==1&&k!==2||k===6),n.classList.toggle("uk-hidden",k!==4),o.classList.toggle("uk-hidden",k!==5),l.classList.toggle("uk-hidden",k!==7),r.classList.toggle("uk-hidden",k!==4&&k!==5&&k!==7),r.querySelector("input").required=k===7,c.classList.toggle("uk-hidden",k!==1)};h(t.SiteType),s.addEventListener("change",()=>h(parseInt(s.value))),document.getElementById("edit-site-form").addEventListener("submit",async k=>{k.preventDefault();let d=k.target.querySelector('[type="submit"]'),m=d.innerHTML;d.disabled=!0,d.innerHTML='<div uk-spinner="ratio: 0.6"></div> Saving...';let b=new FormData(k.target),v=parseInt(b.get("site_type")),f=null;v===4&&(f=parseInt(b.get("node_version"))),v===5&&(f=parseInt(b.get("dotnet_version"))),v===7&&(f=parseInt(b.get("python_version")));let w={php_version:parseInt(b.get("php_version"))||3,site_type:v,runtime_version:f,start_command:b.get("start_command")?.trim()||""},S=v===1?b.get("install_wordpress")==="on":!1;try{if(await p.put(`/sites/${t.ID}`,w),a.hide(),document.getElementById("kp-edit-site-modal")?.remove(),v!==6){$("Applying Changes","Saving changes and recreating pod...");try{await p.post(`/sites/${t.ID}/recreate`,{install_wordpress:S}),x(),u.success("Site updated and pod recreated")}catch(I){x(),u.error("Site saved but pod recreate failed: "+I.message)}}else u.success("Site updated");y.go("site-detail",{id:String(t.ID)})}catch(I){u.error(I.message),d.disabled=!1,d.innerHTML=m}}),document.getElementById("kp-edit-site-modal").addEventListener("hidden",()=>document.getElementById("kp-edit-site-modal")?.remove())}function Zt(t){return`
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

        </div>`}function Ye(t){if(!t||t.length===0)return'<p class="kp-muted uk-text-small uk-margin-remove">No snapshots yet.</p>';let e=s=>s===2?'<span class="kp-mono" style="color:var(--kp-cyan)">S3</span>':'<span class="kp-mono" style="color:var(--kp-blue)">Local</span>';return`
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
            <tbody>${t.map(s=>`
        <tr>
            <td class="kp-mono" style="font-size:0.8rem">${g(s.SnapshotID)}</td>
            <td>${s.Label?g(s.Label):"\u2014"}</td>
            <td>${e(s.BackupType)}</td>
            <td>${L(s.SizeBytes)}</td>
            <td>${new Date(s.Created).toLocaleString()}</td>
            <td>
                <div class="uk-flex" style="gap:6px">
                    <button class="uk-button kp-btn-ghost kp-btn-sm backup-download-btn"
                        data-id="${s.ID}" uk-tooltip="Download backup archive">
                        <span uk-icon="download"></span>
                    </button>
                    <button class="uk-button kp-btn-secondary kp-btn-sm backup-restore-btn"
                        data-id="${s.ID}" uk-tooltip="Restore from this snapshot">
                        <span uk-icon="history"></span>
                    </button>
                    <button class="uk-button kp-btn-danger kp-btn-sm backup-delete-btn"
                        data-id="${s.ID}" uk-tooltip="Delete this snapshot">
                        <span uk-icon="trash"></span>
                    </button>
                </div>
            </td>
        </tr>`).join("")}</tbody>
        </table>
        </div>`}function Yt(t,e){let a=Date.now()+18e5,s=setInterval(async()=>{try{let i=await p.get(`/sites/${e}/backups/restore-status`);(!i?.active||Date.now()>a)&&(clearInterval(s),x(),i?.active?u.error("Import timed out \u2014 check server logs"):u.success("Import complete"),await j(t,e))}catch{}},3e3)}async function j(t,e){try{let[a,s]=await Promise.all([p.get(`/sites/${e}/backup-repo`),p.get(`/sites/${e}/backups`)]),i=t.querySelector("#backup-local-enabled"),n=t.querySelector("#backup-s3-enabled");i&&(i.checked=!!a.LocalEnabled),n&&(n.checked=!!a.S3Enabled);let o=t.querySelector("#backup-error-banner");if(o)if(a.last_error){let r=a.last_error_at?` (${new Date(a.last_error_at).toLocaleString()})`:"";o.innerHTML=`
                    <div uk-alert class="uk-alert-warning">
                        <a class="uk-alert-close" uk-close></a>
                        <p><strong>Last scheduled backup failed${r}:</strong> ${g(a.last_error)}</p>
                    </div>`}else o.innerHTML="";let l=t.querySelector("#backup-list-wrap");l&&(l.innerHTML=Ye(s))}catch(a){let s=t.querySelector("#backup-list-wrap");s&&(s.innerHTML=`<p class="kp-muted uk-text-small">Failed to load backups: ${g(a.message)}</p>`)}}function te(t,e){t.querySelector("#backup-repo-save")?.addEventListener("click",async()=>{let s={local_enabled:t.querySelector("#backup-local-enabled")?.checked??!1,s3_enabled:t.querySelector("#backup-s3-enabled")?.checked??!1};try{await p.put(`/sites/${e}/backup-repo`,s),u.success("Backup destinations saved")}catch(i){u.error(i.message)}}),t.querySelector("#backup-run-btn")?.addEventListener("click",async()=>{try{await p.post(`/sites/${e}/backups`,{label:"manual"})}catch(n){u.error(n.message);return}$("Backup Running","Snapshotting files and database \u2014 this may take a few minutes.");let s=Date.now()+1800*1e3,i=setInterval(async()=>{try{let n=await p.get(`/sites/${e}/backups/backup-status`);(!n?.active||Date.now()>s)&&(clearInterval(i),x(),await j(t,e),n?.active?u.error("Backup is taking longer than expected \u2014 check server logs for status"):n?.error?u.error(`Backup failed: ${n.error}`):u.success("Backup complete"))}catch{}},4e3)}),t.querySelector("#backup-list-wrap")?.addEventListener("click",async s=>{let i=s.target.closest(".backup-restore-btn");if(i){let l=i.dataset.id;if(!await E("Restore Site","This will restore the site from the selected snapshot. The site will show a maintenance page during the restore. Continue?"))return;try{await p.post(`/sites/${e}/backups/${l}/restore`)}catch(d){u.error(d.message);return}$("Restore Running","Restoring files and database \u2014 the site will return automatically when complete.");let c=Date.now(),h=Date.now()+900*1e3,k=setInterval(async()=>{try{let d=await p.get(`/sites/${e}/backups/restore-status`);(!d?.active||Date.now()>h)&&(clearInterval(k),x(),d?.active?u.error("Restore timed out"):u.success("Restore complete"),await j(t,e))}catch{}},3e3);return}let n=s.target.closest(".backup-delete-btn");if(n){let l=n.dataset.id;if(!await E("Delete Snapshot","This will permanently remove the snapshot from all configured repositories. This cannot be undone."))return;$("Deleting Snapshot","Removing snapshot data from repositories \u2014 this may take a moment.");try{await p.delete(`/sites/${e}/backups/${l}`),x(),u.success("Snapshot deleted"),await j(t,e)}catch(c){x(),u.error(c.message)}}let o=s.target.closest(".backup-download-btn");if(o){let l=o.dataset.id,r=`${Date.now().toString(36)}${Math.random().toString(36).slice(2,10)}`,c=`kp_dl_${r}`;$("Preparing Download","Your backup archive is being generated \u2014 this may take a moment depending on site size. Your download will begin automatically. Do not close this tab."),setTimeout(()=>{let h=document.createElement("a");h.href=`/api/sites/${e}/backups/${l}/download?dl=${r}`,h.style.display="none",document.body.appendChild(h),h.click(),document.body.removeChild(h);let k=Date.now(),d=setInterval(()=>{!document.cookie.split(";").some(b=>b.trim().startsWith(`${c}=`))&&Date.now()-k<18e5||(clearInterval(d),document.cookie=`${c}=; Path=/; Max-Age=0`,x())},500)},300);return}});let a=t.querySelector("#import-backup-modal");a&&(UIkit.util.on(a,"beforeshow",async()=>{let s=a.querySelector("#import-target-site");try{let n=await p.get("/sites"),o=Number(e);s.innerHTML=n.map(l=>`<option value="${l.ID}"${Number(l.ID)===o?" selected":""}>${l.Name}</option>`).join("")}catch{s.innerHTML='<option value="">Failed to load sites</option>'}let i=a.querySelector("#import-sftp-list");try{let n=await p.get(`/sites/${e}/backups/import/files`);!n||n.length===0?i.innerHTML='<p class="kp-muted uk-text-small">No files found.</p>':i.innerHTML=n.map(o=>`
                    <div class="uk-flex uk-flex-middle uk-flex-between uk-margin-small-bottom">
                        <span class="kp-mono uk-text-small">${g(o)}</span>
                        <button class="uk-button kp-btn-primary kp-btn-sm import-sftp-btn" data-file="${g(o)}">
                            Restore
                        </button>
                    </div>`).join("")}catch(n){i.innerHTML=`<p class="kp-muted uk-text-small">Failed to list files: ${g(n.message)}</p>`}}),a.querySelector("#import-upload-btn")?.addEventListener("click",async()=>{let s=a.querySelector("#import-file-input"),i=a.querySelector("#import-target-site")?.value;if(!s?.files?.length){u.error("Select an archive file first");return}let n=s.files[0],o=new FormData;o.append("archive",n),o.append("target_site_id",i),UIkit.modal(a).hide(),$("Importing Backup","Uploading and restoring \u2014 this may take several minutes.");try{await fetch(`/api/sites/${e}/backups/import/upload`,{method:"POST",headers:{"X-CSRF-Token":window.KP?.csrf??""},body:o,credentials:"same-origin"}).then(async l=>{if(!l.ok){let r=await l.json().catch(()=>({}));throw new Error(r.error||`HTTP ${l.status}`)}})}catch(l){x(),u.error(l.message);return}Yt(t,e)}),a.querySelector("#import-sftp-list")?.addEventListener("click",async s=>{let i=s.target.closest(".import-sftp-btn");if(!i)return;let n=i.dataset.file,o=a.querySelector("#import-target-site")?.value;UIkit.modal(a).hide(),$("Importing from SFTP","Restoring archive \u2014 this may take several minutes.");try{await p.post(`/sites/${e}/backups/import/sftp`,{filename:n,target_site_id:parseInt(o,10)})}catch(l){x(),u.error(l.message);return}Yt(t,e)}))}function Lt(){return`
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
        </div>`}async function X(t){let e=document.getElementById("basicauth-panel");if(e)try{let[a,s]=await Promise.all([p.get(`/sites/${t}/basicauth`),p.get(`/sites/${t}/basicauth/users`)]),i=e.querySelector("#ba-enabled"),n=e.querySelector("#ba-realm");i&&(i.checked=!!a.Enabled),n&&(n.value=a.Realm??"Restricted"),Ze(e,s??[])}catch(a){u.error("Failed to load basic auth settings: "+a.message)}}function Ze(t,e){let a=t.querySelector("#ba-users-list");if(a){if(!e.length){a.innerHTML='<p class="kp-muted uk-text-small">No credentials configured.</p>';return}a.innerHTML=e.map(s=>`
        <div class="uk-flex uk-flex-middle uk-margin-small-bottom ba-user-row" data-uid="${s.id}" style="gap:8px">
            <span class="kp-mono" style="flex:1">${g(s.username)}</span>
            <a href="javascript:void(0);" class="kp-muted ba-delete-btn" uk-icon="trash" uk-tooltip="Remove credential"></a>
        </div>`).join("")}}function Tt(t,e){let a=new AbortController,s={signal:a.signal};t.addEventListener("click",async i=>{if(!i.target.closest("#ba-config-save"))return;let n=t.querySelector("#ba-config-save"),o=n.innerHTML;n.disabled=!0,n.innerHTML='<div uk-spinner="ratio: 0.5"></div>';try{await p.put(`/sites/${e}/basicauth`,{enabled:t.querySelector("#ba-enabled").checked,realm:t.querySelector("#ba-realm").value.trim()||"Restricted"}),u.success("Basic auth settings saved")}catch(l){u.error(l.message)}finally{n.disabled=!1,n.innerHTML=o}},s),t.addEventListener("click",async i=>{if(!i.target.closest("#ba-add-user"))return;let n=t.querySelector("#ba-new-username").value.trim(),o=t.querySelector("#ba-new-password").value;if(!n||!o){u.error("Username and password are required");return}let l=t.querySelector("#ba-add-user"),r=l.innerHTML;l.disabled=!0,l.innerHTML='<div uk-spinner="ratio: 0.5"></div>';try{await p.put(`/sites/${e}/basicauth/users`,{username:n,password:o}),u.success(`Credential saved for ${n}`),t.querySelector("#ba-new-username").value="",t.querySelector("#ba-new-password").value="",await X(e)}catch(c){u.error(c.message)}finally{l.disabled=!1,l.innerHTML=r}},s),t.addEventListener("click",async i=>{let n=i.target.closest(".ba-delete-btn");if(!n)return;let o=n.closest(".ba-user-row")?.dataset.uid;if(o)try{await p.delete(`/sites/${e}/basicauth/users/${o}`),u.success("Credential removed"),await X(e)}catch(l){u.error(l.message)}},s),t.__basicAuthAbort?.abort(),t.__basicAuthAbort=a}var Q={1:"Nginx",2:"PHP",3:"MariaDB",4:"Redis",5:"Varnish"};function Z(t,e,a){let s=a?Object.entries(a):[];return`
        <div>
            <div class="uk-flex uk-flex-between uk-flex-middle uk-margin-small-bottom">
                <div class="uk-flex uk-flex-middle" style="gap:10px">
                    <h4 class="kp-view-title uk-margin-remove">${Q[e]}</h4>
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
                ${s.map(([i,n])=>Y(i,n)).join("")}
            </div>
        </div>`}function ee(t,e){let a=e?.enabled==="true",s=e?Object.entries(e).filter(([i])=>i!=="enabled"):[];return`
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
                    <input type="checkbox" class="uk-checkbox varnish-enabled-toggle" ${a?"checked":""}>
                    <span>Enable Varnish Cache</span>
                    <span class="kp-muted uk-text-small">\u2014 requires pod recreate to take effect</span>
                </label>
            </div>

            <div class="kp-config-grid cfg-rows" data-type="5">
                ${s.map(([i,n])=>Y(i,n)).join("")}
            </div>
        </div>`}function Y(t="",e=""){return`<div class="kp-config-row">
        <div class="kp-config-key">
            <input class="cfg-key" type="text" value="${t}" placeholder="key">
        </div>
        <div class="kp-config-val">
            <input class="cfg-val" type="text" value="${e}" placeholder="value">
        </div>
        <button class="kp-config-del cfg-del-row" title="Remove">
            <span uk-icon="icon: close; ratio: 0.8"></span>
        </button>
    </div>`}function ae(t,e,a){t.addEventListener("click",s=>{if(s.target.closest(".cfg-add-row")){let i=s.target.closest(".cfg-add-row");t.querySelector(`.cfg-rows[data-type="${i.dataset.type}"]`).insertAdjacentHTML("beforeend",Y())}},{signal:a}),t.addEventListener("click",s=>{s.target.closest(".cfg-del-row")&&s.target.closest(".kp-config-row").remove()},{signal:a}),t.addEventListener("click",async s=>{let i=s.target.closest(".cfg-save");if(!i)return;let{type:n,site:o}=i.dataset,l=t.querySelectorAll(`.cfg-rows[data-type="${n}"] .kp-config-row`),r={};if(l.forEach(c=>{let h=c.querySelector(".cfg-key").value.trim(),k=c.querySelector(".cfg-val").value.trim();h&&(r[h]=k)}),n==="5"){let c=t.querySelector(".varnish-enabled-toggle");r.enabled=c?.checked?"true":"false"}try{await p.put(`/sites/${o}/configs/${n}`,r),u.success(`${Q[n]} config saved`)}catch(c){u.error(c.message)}},{signal:a}),t.addEventListener("click",async s=>{let i=s.target.closest(".cfg-reset");if(!i)return;let{type:n,site:o}=i.dataset;if(await E("Reset Config",`Reset ${Q[n]} config to defaults?`))try{let r=await p.post(`/sites/${o}/configs/${n}/reset`),c=t.querySelector(`.cfg-rows[data-type="${n}"]`);c.innerHTML=Object.entries(r).map(([h,k])=>Y(h,k)).join(""),u.success(`${Q[n]} reset to defaults`)}catch(r){u.error(r.message)}},{signal:a}),t.addEventListener("change",async s=>{let i=s.target.closest(".cfg-import-input");if(!i)return;let{type:n,site:o}=i.dataset,l=i.files[0];if(!l)return;let r=new FormData;r.append("file",l);try{let c=await fetch(`/api/sites/${o}/configs/${n}/import`,{method:"POST",headers:{"X-CSRF-Token":window.KP?.csrf??""},body:r}),h=c.status===204?null:await c.json().catch(()=>null);if(!c.ok)throw new Error(h?.error||`HTTP ${c.status}`);let k=t.querySelector(`.cfg-rows[data-type="${n}"]`);k.innerHTML=Object.entries(h).map(([d,m])=>Y(d,m)).join(""),u.success(`${Q[n]} config imported`)}catch(c){u.error(c.message)}finally{i.value=""}},{signal:a})}function ne(t){return`
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

        </div>`}function ie(t){if(!t||t.length===0)return'<p class="kp-muted uk-text-small uk-margin-remove">No cron jobs configured.</p>';let e=s=>s?new Date(s).toLocaleString():"\u2014";return`
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
            <tbody>${t.map(s=>`
        <tr>
            <td class="kp-text">${s.Label||'<span class="kp-muted">\u2014</span>'}</td>
            <td class="kp-mono kp-text-sm">${s.Schedule}</td>
            <td class="kp-muted uk-text-small">${e(s.LastRun)}</td>
            <td>
                ${s.LastError?'<span class="kp-badge kp-badge-error">Error</span>':s.LastRun?'<span class="kp-badge kp-badge-success">OK</span>':'<span class="kp-muted uk-text-small">\u2014</span>'}
                ${s.LastOutput||s.LastError?`<a class="kp-cron-detail-btn cron-detail-btn" data-id="${s.ID}" uk-tooltip="View Run Details">
                            <span uk-icon="icon: info; ratio: 0.75"></span>
                        </a>`:""}
            </td>
            <td>
                <input type="checkbox" class="uk-checkbox cron-toggle"
                    data-id="${s.ID}" ${s.Enabled?"checked":""}>
            </td>
            <td>
                <div class="uk-flex kp-cron-actions">
                    <button class="uk-button kp-btn-ghost kp-btn-sm cron-run-btn"
                        data-id="${s.ID}" uk-tooltip="Run Now">
                        <span uk-icon="play"></span>
                    </button>
                    <button class="uk-button kp-btn-ghost kp-btn-sm cron-edit-btn"
                        data-id="${s.ID}" uk-tooltip="Edit">
                        <span uk-icon="pencil"></span>
                    </button>
                    <button class="uk-button kp-btn-danger kp-btn-sm cron-delete-btn"
                        data-id="${s.ID}" uk-tooltip="Delete">
                        <span uk-icon="trash"></span>
                    </button>
                </div>
            </td>
        </tr>`).join("")}</tbody>
        </table>
        </div>`}async function ut(t,e){let a=t.querySelector("#cron-list-wrap");if(a)try{let s=await p.get(`/sites/${e}/crons`);a.innerHTML=ie(s)}catch(s){a.innerHTML=`<p class="kp-muted uk-text-small">Failed to load cron jobs: ${g(s.message)}</p>`}}function oe(t,e){let a=[],s=t.querySelector("#cron-modal"),i=t.querySelector("#cron-modal-title"),n=t.querySelector("#cron-modal-id"),o=t.querySelector("#cron-modal-label"),l=t.querySelector("#cron-modal-command"),r=t.querySelector("#cron-modal-schedule"),c=t.querySelector("#cron-schedule-preview"),h=t.querySelector("#cron-modal-enabled");r?.addEventListener("input",()=>{c.textContent=se(r.value.trim())}),t.querySelector("#cron-add-btn")?.addEventListener("click",()=>{i.textContent="Add Cron Job",n.value="",o.value="",l.value="",r.value="",c.textContent="",h.checked=!0,UIkit.modal(s).show()}),t.querySelector("#cron-modal-save")?.addEventListener("click",async()=>{let k=l.value.trim(),d=r.value.trim();if(!k||!d){u.error("Command and schedule are required");return}let m={label:o.value.trim(),command:k,schedule:d,enabled:h.checked},b=n.value;try{b?(await p.put(`/sites/${e}/crons/${b}`,m),u.success("Cron job updated")):(await p.post(`/sites/${e}/crons`,m),u.success("Cron job created")),UIkit.modal(s).hide(),await ut(t,e),a=await p.get(`/sites/${e}/crons`)}catch(v){u.error(v.message)}}),t.querySelector("#cron-list-wrap")?.addEventListener("click",async k=>{let d=k.target.closest(".cron-detail-btn");if(d){let f=d.dataset.id,w=a.find(I=>String(I.ID)===f);if(!w)return;document.body.insertAdjacentHTML("beforeend",`
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
                </div>`);let S=document.getElementById("cron-detail-modal");UIkit.modal(S).show(),S.addEventListener("hidden",()=>S.remove(),{once:!0});return}let m=k.target.closest(".cron-edit-btn");if(m){let f=m.dataset.id,w=a.find(S=>String(S.ID)===f);if(!w)return;i.textContent="Edit Cron Job",n.value=w.ID,o.value=w.Label||"",l.value=w.Command,r.value=w.Schedule,c.textContent=se(w.Schedule),h.checked=w.Enabled,UIkit.modal(s).show();return}let b=k.target.closest(".cron-delete-btn");if(b){let f=b.dataset.id;if(!await E("Delete Cron Job","This will permanently remove the cron job. Continue?"))return;try{await p.delete(`/sites/${e}/crons/${f}`),u.success("Cron job deleted"),await ut(t,e),a=await p.get(`/sites/${e}/crons`)}catch(S){u.error(S.message)}return}let v=k.target.closest(".cron-run-btn");if(v){let f=v.dataset.id;try{await p.post(`/sites/${e}/crons/${f}/run`)}catch(q){u.error(q.message);return}$("Running Cron Job","Executing the job inside the container \u2014 please wait.");let w=null;try{w=(await p.get(`/sites/${e}/crons`)).find(D=>String(D.ID)===f)?.LastRun??null}catch{}let S=Date.now()+300*1e3,I=setInterval(async()=>{try{let q=await p.get(`/sites/${e}/crons`),D=q.find(et=>String(et.ID)===f);if(!D||D.LastRun!==w||Date.now()>S){clearInterval(I),x(),a=q??[];let et=t.querySelector("#cron-list-wrap");et&&(et.innerHTML=ie(q)),D?.LastError?u.error(`Job failed: ${D.LastError}`):u.success("Cron job complete")}}catch{}},2e3);return}}),t.querySelector("#cron-list-wrap")?.addEventListener("change",async k=>{let d=k.target.closest(".cron-toggle");if(!d)return;let m=d.dataset.id;try{await p.patch(`/sites/${e}/crons/${m}/toggle`,{enabled:d.checked}),u.success(d.checked?"Cron job enabled":"Cron job disabled")}catch(b){u.error(b.message),d.checked=!d.checked}}),p.get(`/sites/${e}/crons`).then(k=>{a=k??[]}).catch(()=>{})}function se(t){if(!t)return"";let e=t.trim().split(/\s+/);if(e.length!==5)return"invalid expression";let[a,s,i,n,o]=e;if(t==="* * * * *")return"every minute";if(a!=="*"&&s!=="*"&&i==="*"&&n==="*"&&o==="*")return`daily at ${s.padStart(2,"0")}:${a.padStart(2,"0")}`;if(a!=="*"&&s!=="*"&&i==="*"&&n==="*"&&o!=="*"){let l=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];return`weekly on ${o.split(",").map(c=>l[parseInt(c)]??c).join(", ")} at ${s.padStart(2,"0")}:${a.padStart(2,"0")}`}return a.startsWith("*/")?`every ${a.slice(2)} minutes`:s.startsWith("*/")?`every ${s.slice(2)} hours`:t}var B="";function ue(t){return`
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
        </div>`}function ta(){let t=B?B.split("/"):[],e="",a=['<a href="#" data-path="">html</a>'];for(let s of t)e=e?e+"/"+s:s,a.push(`<span class="kp-fm-sep">/</span><a href="#" data-path="${g(e)}">${g(s)}</a>`);return a.join("")}function ea(t){let e=new Date(t);return isNaN(e)?"":e.toLocaleString(void 0,{year:"numeric",month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})}function le(t){return t==="d"?"folder":t==="l"?"link":"file-text"}function O(t,e){return t?t+"/"+e:e}var re=new Set(["php","js","jsx","ts","tsx","css","scss","sass","less","html","htm","xml","json","txt","md","markdown","yml","yaml","ini","conf","cnf","toml","env","sh","bash","sql","log","csv","tsv","svg","htaccess","gitignore","lock","map"]);function aa(t,e){if(e)return!1;let a=t.lastIndexOf(".");return t.startsWith(".")&&a===0?re.has(t.slice(1).toLowerCase()):a>=0&&re.has(t.slice(a+1).toLowerCase())}function sa(t){if(!t||!t.length)return st("folder","This folder is empty");let e=document.getElementById("fm-root").dataset.site;return`
        <table class="uk-table uk-table-divider uk-table-small uk-table-middle kp-fm-table">
            <thead>
                <tr>
                    <th>Name</th><th>Size</th><th>Perms</th><th>Modified</th><th></th>
                </tr>
            </thead>
            <tbody>${t.map(s=>{let i=O(B,s.name),n=s.is_dir,o=aa(s.name,n),l=n?`<a href="#" class="fm-nav" data-path="${g(i)}"><span uk-icon="icon: ${le(s.type)}; ratio: 0.9"></span> ${g(s.name)}</a>`:`<span><span uk-icon="icon: ${le(s.type)}; ratio: 0.9"></span> ${g(s.name)}</span>`;return`
            <tr data-path="${g(i)}" data-name="${g(s.name)}" data-dir="${n?1:0}" data-mode="${g(s.mode)}">
                <td class="kp-fm-name">${l}</td>
                <td class="uk-text-nowrap">${L(s.size,n)}</td>
                <td><code class="kp-mono">${g(s.mode)}</code></td>
                <td class="uk-text-nowrap uk-text-small kp-muted">${ea(s.mod_time)}</td>
                <td class="uk-text-right uk-text-nowrap">
                    ${o?`<button class="kp-fm-act fm-edit" data-path="${g(i)}" uk-tooltip="Edit"><span uk-icon="icon: pencil; ratio: 0.85"></span></button>`:""}
                    ${n?"":`<a class="kp-fm-act fm-download" href="/api/sites/${e}/files/download?path=${encodeURIComponent(i)}" uk-tooltip="Download"><span uk-icon="icon: download; ratio: 0.85"></span></a>`}
                    <button class="kp-fm-act fm-chmod" uk-tooltip="Permissions"><span uk-icon="icon: settings; ratio: 0.85"></span></button>
                    <button class="kp-fm-act fm-rename" uk-tooltip="Rename / Move"><span uk-icon="icon: move; ratio: 0.85"></span></button>
                    <button class="kp-fm-act fm-copy" uk-tooltip="Copy"><span uk-icon="icon: copy; ratio: 0.85"></span></button>
                    <button class="kp-fm-act fm-delete" uk-tooltip="Delete"><span uk-icon="icon: trash; ratio: 0.85"></span></button>
                </td>
            </tr>`}).join("")}</tbody>
        </table>`}async function C(t){let e=document.getElementById("fm-list"),a=document.getElementById("fm-breadcrumb");if(e){e.innerHTML=at(),a&&(a.innerHTML=ta());try{let s=await p.get(`/sites/${t}/files?path=${encodeURIComponent(B)}`);e.innerHTML=sa(s)}catch(s){e.innerHTML=T("Failed to list files: "+s.message)}}}function ce(t,e){B=e||"",C(t)}function tt(t,e,a=""){return new Promise(s=>{let i="fm-prompt-modal";document.getElementById(i)?.remove();let n=document.createElement("div");n.id=i,n.setAttribute("uk-modal",""),n.innerHTML=`
            <div class="uk-modal-dialog uk-modal-body kp-modal">
                <h3 class="uk-modal-title">${g(t)}</h3>
                <label class="kp-label uk-margin-small-bottom">${g(e)}</label>
                <input class="uk-input kp-input" id="fm-prompt-input" value="${g(a)}" autocomplete="off">
                <div class="uk-flex uk-flex-right uk-margin-top" style="gap:8px">
                    <button class="uk-button kp-btn-ghost uk-modal-close">Cancel</button>
                    <button class="uk-button kp-btn-primary" id="fm-prompt-ok">OK</button>
                </div>
            </div>`,document.body.appendChild(n),window.UIkit&&UIkit.icon(n);let o=UIkit.modal(n),l=n.querySelector("#fm-prompt-input"),r=!1,c=h=>{r||(r=!0,s(h),o.hide())};n.querySelector("#fm-prompt-ok").addEventListener("click",()=>c(l.value.trim()||null)),l.addEventListener("keydown",h=>{h.key==="Enter"&&(h.preventDefault(),c(l.value.trim()||null))}),UIkit.util.on(n,"hidden",()=>{r||(r=!0,s(null)),n.remove()}),o.show(),setTimeout(()=>l.focus(),50)})}async function na(t,e){let a=O(B,e.name),s=await fetch(`/api/sites/${t}/files/upload?path=${encodeURIComponent(a)}`,{method:"POST",headers:{"X-CSRF-Token":window.KP?.csrf??""},body:e}),i=s.status===204?null:await s.json().catch(()=>null);if(!s.ok)throw new Error(i?.error||`HTTP ${s.status}`)}function pe(t,e){B="",t.addEventListener("click",a=>{let s=a.target.closest("#fm-breadcrumb a");if(s){a.preventDefault(),ce(e,s.dataset.path);return}let i=a.target.closest(".fm-nav");if(i){a.preventDefault(),ce(e,i.dataset.path);return}let n=a.target.closest(".fm-edit");if(n){a.preventDefault(),la(e,n.dataset.path,n.dataset.path.split("/").pop());return}}),t.querySelector("#fm-new-file")?.addEventListener("click",async()=>{let a=await tt("New File","File name");if(a)try{await p.post(`/sites/${e}/files/file`,{path:O(B,a)}),C(e)}catch(s){u.error(s.message)}}),t.querySelector("#fm-new-dir")?.addEventListener("click",async()=>{let a=await tt("New Folder","Folder name");if(a)try{await p.post(`/sites/${e}/files/dir`,{path:O(B,a)}),C(e)}catch(s){u.error(s.message)}}),t.querySelector("#fm-upload")?.addEventListener("change",async a=>{let s=[...a.target.files];if(s.length)try{for(let i of s)await na(e,i);u.success(s.length===1?"File uploaded":`${s.length} files uploaded`),C(e)}catch(i){u.error(i.message)}finally{a.target.value=""}}),t.querySelector("#fm-refresh")?.addEventListener("click",()=>C(e)),t.addEventListener("click",async a=>{let s=a.target.closest("tr[data-path]");if(!s)return;let i=s.dataset.path,n=s.dataset.name;if(a.target.closest(".fm-chmod")){let o=await tt("Permissions",`Octal mode for "${n}"`,s.dataset.mode);if(!o)return;try{await p.patch(`/sites/${e}/files/chmod`,{path:i,mode:o}),C(e)}catch(l){u.error(l.message)}return}if(a.target.closest(".fm-rename")){let o=await tt("Rename / Move","New path (relative to current folder)",n);if(!o||o===n)return;try{await p.post(`/sites/${e}/files/move`,{src:i,dst:O(B,o)}),C(e)}catch(l){u.error(l.message)}return}if(a.target.closest(".fm-copy")){let o=await tt("Copy","Destination name",n+"-copy");if(!o)return;try{await p.post(`/sites/${e}/files/copy`,{src:i,dst:O(B,o)}),C(e)}catch(l){u.error(l.message)}return}if(a.target.closest(".fm-delete")){if(!await E("Delete",`Delete "${n}"? This cannot be undone.`))return;try{await p.delete(`/sites/${e}/files?path=${encodeURIComponent(i)}`),C(e)}catch(l){u.error(l.message)}return}})}var pt=null;function de(t){if(document.querySelector(`link[href="${t}"]`))return;let e=document.createElement("link");e.rel="stylesheet",e.href=t,document.head.appendChild(e)}function _t(t){return new Promise((e,a)=>{let s=document.querySelector(`script[src="${t}"]`);if(s){if(s.dataset.loaded)return e();s.addEventListener("load",()=>e()),s.addEventListener("error",()=>a(new Error("failed to load "+t)));return}let i=document.createElement("script");i.src=t,i.addEventListener("load",()=>{i.dataset.loaded="1",e()}),i.addEventListener("error",()=>a(new Error("failed to load "+t))),document.head.appendChild(i)})}function ia(){if(pt)return pt;let t="https://cdn.jsdelivr.net/npm/codemirror@5";return de(`${t}/lib/codemirror.css`),de(`${t}/theme/material-darker.css`),pt=_t(`${t}/lib/codemirror.js`).then(()=>Promise.all([_t(`${t}/mode/meta.js`),_t(`${t}/addon/mode/loadmode.js`)])).then(()=>{window.CodeMirror.modeURL=`${t}/mode/%N/%N.js`}),pt}function oa(t){let e=window.CodeMirror.findModeByFileName(t);return e?e.mode:null}async function la(t,e,a){let s;try{s=await p.get(`/sites/${t}/files/content?path=${encodeURIComponent(e)}`)}catch(d){let m=/too large/i.test(d.message)?"File is too large to edit \u2014 download it instead.":/binary/i.test(d.message)?"Binary file \u2014 download it instead of editing.":d.message;u.error(m);return}try{await ia()}catch(d){u.error("Editor failed to load: "+d.message);return}let i="fm-editor-modal";document.getElementById(i)?.remove();let n=document.createElement("div");n.id=i,n.setAttribute("uk-modal",""),n.innerHTML=`
        <div class="uk-modal-dialog kp-modal kp-fm-editor-dialog">
            <div class="uk-flex uk-flex-middle uk-flex-between uk-padding-small">
                <h3 class="uk-modal-title uk-margin-remove"><span uk-icon="file-text"></span> ${g(a)} <span id="fm-ed-dirty" class="kp-muted uk-text-small" hidden>\u2022 unsaved</span></h3>
                <div class="uk-flex" style="gap:8px">
                    <button class="uk-button kp-btn-primary kp-btn-sm" id="fm-ed-save"><span uk-icon="icon: check; ratio: 0.85"></span> Save</button>
                    <button class="uk-button kp-btn-ghost kp-btn-sm uk-modal-close"><span uk-icon="icon: close; ratio: 0.85"></span></button>
                </div>
            </div>
            <div class="kp-fm-editor-body">
                <textarea id="fm-ed-area"></textarea>
            </div>
        </div>`,document.body.appendChild(n),window.UIkit&&UIkit.icon(n);let o=UIkit.modal(n,{bgClose:!1,escClose:!0}),l=n.querySelector("#fm-ed-dirty"),r=null,c=!0,h=d=>{c=!d,l.hidden=!d};UIkit.util.on(n,"shown",()=>{if(r)return;r=window.CodeMirror.fromTextArea(n.querySelector("#fm-ed-area"),{value:s.content,lineNumbers:!0,theme:"material-darker",indentUnit:4,lineWrapping:!1,extraKeys:{"Ctrl-S":k,"Cmd-S":k,"Ctrl-F":"findPersistent","Ctrl-/":"toggleComment"}}),r.setValue(s.content),r.on("change",()=>h(!0));let d=oa(a);d&&(r.setOption("mode",d),window.CodeMirror.autoLoadMode(r,d)),setTimeout(()=>r.refresh(),30)}),UIkit.util.on(n,"hidden",()=>n.remove());async function k(){if(!r)return;let d=n.querySelector("#fm-ed-save"),m=d.innerHTML;d.disabled=!0,d.innerHTML='<div uk-spinner="ratio: 0.6"></div>';try{await p.put(`/sites/${t}/files/content`,{path:e,content:r.getValue()}),h(!1),u.success("Saved"),C(t)}catch(b){u.error(b.message)}finally{d.disabled=!1,d.innerHTML=m}}n.querySelector("#fm-ed-save").addEventListener("click",k),UIkit.util.on(n,"beforehide",d=>{!c&&!window.confirm("Discard unsaved changes?")&&d.preventDefault()}),o.show()}var ra=2e3;function Pt(t,e){return`
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
        </div>`}function me(t,e){let a=null,s=!1,i=t.querySelector("#log-output"),n=t.querySelector("#log-connect"),o=t.querySelector("#log-disconnect"),l=t.querySelector("#log-clear"),r=t.querySelector("#log-autoscroll"),c=t.querySelector("#log-status");function h(m){for(m.split(`
`).forEach(b=>{if(!b)return;let v=document.createElement("div");v.className=b.match(/WAF BLOCK/i)?"kp-log-line-err":b.match(/WAF DETECT/i)?"kp-log-line-warn":b.match(/error|crit|emerg/i)?"kp-log-line-err":b.match(/warn/i)?"kp-log-line-warn":b.match(/info|notice/i)?"kp-log-line-info":"",v.textContent=b,i.appendChild(v)});i.childElementCount>ra;)i.removeChild(i.firstChild);r.checked&&(i.scrollTop=i.scrollHeight)}function k(){a&&(a.close(),a=null),s=!1,n.disabled=!1,o.disabled=!0,c&&(c.textContent="Disconnected")}n.addEventListener("click",()=>{k();let m=t.querySelector("#log-container").value,b=t.querySelector("#log-tail").value,v=location.protocol==="https:"?"wss":"ws",f=m==="waf"?`${v}://${location.host}/api/sites/${e}/logs/waf?tail=${b}`:m==="proxy"?`${v}://${location.host}/api/sites/${e}/logs/proxy?tail=${b}`:m==="access"?`${v}://${location.host}/api/sites/${e}/logs/proxy?tail=${b}`:`${v}://${location.host}/api/sites/${e}/logs?container=${m}&tail=${b}`;a=new WebSocket(f),a.onopen=()=>{s=!0,n.disabled=!0,o.disabled=!1,c&&(c.textContent=`Connected \u2014 ${m}`)},a.onmessage=w=>h(w.data),a.onerror=()=>{},a.onclose=()=>{s=!1,n.disabled=!1,o.disabled=!0,c&&(c.textContent="Disconnected")}}),o.addEventListener("click",k),l.addEventListener("click",()=>{i.innerHTML=""}),t.querySelector("#log-container").addEventListener("change",()=>{a&&a.readyState===WebSocket.OPEN&&(k(),n.click())});let d=y.go.bind(y);y.go=function(m,b={}){return a&&k(),d(m,b)}}function ca(t){switch(t){case"valid":return'<span class="kp-ssl-valid" uk-icon="icon: lock; ratio: 0.85" uk-tooltip="Valid SSL certificate"></span>';case"self-signed":return'<span class="kp-ssl-self-signed" uk-icon="icon: lock; ratio: 0.85" uk-tooltip="Self-signed certificate"></span>';case"expired":return'<span class="kp-ssl-none" uk-icon="icon: warning; ratio: 0.85" uk-tooltip="Expired certificate"></span>';case"mismatch":return'<span class="kp-ssl-none" uk-icon="icon: warning; ratio: 0.85" uk-tooltip="Certificate does not match this domain"></span>';default:return'<span class="kp-ssl-none" uk-icon="icon: warning; ratio: 0.85" uk-tooltip="No SSL certificate"></span>'}}async function ke(t,e){try{let a=await p.get(`/ssl-status?domain=${encodeURIComponent(t)}`),s=document.getElementById(`ssl-icon-${e}`);s&&(s.outerHTML=ca(a.status))}catch{}}function be(t){t.forEach(e=>ke(e.Domain,e.ID))}function he(t,e,a,s=0,i=null){let n=t.SiteType!==3&&t.PMAPort>0;return`
        <div class="uk-grid-medium" uk-grid>
            <div class="uk-width-1-2@m">
                <div class="kp-card uk-padding-small">
                    <h3 class="kp-view-title uk-margin-bottom">Site Info</h3>
                    <table class="uk-table uk-table-small uk-table-divider uk-margin-remove">
                        <tbody>
                            <tr><td class="kp-muted">Name</td><td>${t.Name}</td></tr>
                            ${i?`<tr><td class="kp-muted">Parent</td><td><a href="javascript:void(0)" data-action="manage" data-id="${s}" style="color:var(--kp-cyan)">${i}</a></td></tr>`:""}
                            <tr><td class="kp-muted">Internal Port</td><td>:${t.Port}</td></tr>
                            <tr><td class="kp-muted">Type</td><td>${J(t.SiteType)}</td></tr>
                            <tr><td class="kp-muted">Version</td><td>${R(t)}</td></tr>
                            <tr><td class="kp-muted">Status</td><td>${M(t.SiteStatus)}</td></tr>
                            <tr><td class="kp-muted">Containers</td><td><div id="sd-health-badges" class="kp-health-badges"></div></td></tr>
                            <tr><td class="kp-muted">Created</td><td>${new Date(t.Created).toLocaleString()}</td></tr>
                        </tbody>
                    </table>
                </div>
                
                ${i?`
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
                        ${e.length?e.map(ve).join(""):'<p class="kp-muted uk-text-small">No domains configured</p>'}
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
                            <tr><td class="kp-muted">User</td><td class="kp-mono">${a?.Username??t.Name}</td></tr>
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
        </div>`}function ve(t){return`<div class="uk-flex uk-flex-between uk-flex-middle kp-config-row" data-domain-id="${t.ID}">
        <div class="uk-flex uk-flex-middle kp-domain-row-inner">
            <span id="ssl-icon-${t.ID}" class="kp-ssl-pending" uk-icon="icon: more; ratio: 0.85"></span>
            <span class="uk-text-small kp-mono">${t.Domain}</span>
        </div>
        <button class="kp-config-del" data-action="delete-domain" data-did="${t.ID}" title="Remove">
            <span uk-icon="icon: close; ratio: 0.8"></span>
        </button>
    </div>`}function ge(t,e){t.querySelector("#domain-add-btn")?.addEventListener("click",()=>{t.querySelector("#domain-add-form").classList.remove("uk-hidden")}),t.querySelector("#domain-cancel-btn")?.addEventListener("click",()=>{t.querySelector("#domain-add-form").classList.add("uk-hidden")}),t.querySelector("#domain-save-btn")?.addEventListener("click",async()=>{let a=t.querySelector("#domain-add-input").value.trim();if(a)try{let s=await p.post(`/sites/${e}/domains`,{domain:a});t.querySelector("#domain-list").insertAdjacentHTML("beforeend",ve(s)),ke(s.Domain,s.ID),t.querySelector("#domain-add-form").classList.add("uk-hidden"),t.querySelector("#domain-add-input").value="",u.success("Domain added")}catch(s){u.error(s.message)}}),t.querySelector("#domain-list")?.addEventListener("click",async a=>{let s=a.target.closest('[data-action="delete-domain"]');if(!(!s||!await E("Remove Domain","Remove this domain from the site?")))try{await p.delete(`/sites/${e}/domains/${s.dataset.did}`),s.closest("[data-domain-id]").remove(),u.success("Domain removed")}catch(n){u.error(n.message)}})}function fe(t,e,a=null){t.querySelector("#sftp-regen-btn")?.addEventListener("click",async()=>{let n=t.querySelector("#sftp-regen-btn"),o=n.innerHTML;n.disabled=!0,n.innerHTML='<div uk-spinner="ratio: 0.5"></div>';try{let l=await p.post(`/sites/${e}/sftp-regen`),r=t.querySelector("#sftp-pass-display");if(r&&l?.password){r.textContent=l.password,r.dataset.revealed="1";let c=t.querySelector("#sftp-reveal-btn");c&&(c.innerHTML='<span uk-icon="icon: eye-slash; ratio: 0.75"></span>')}u.success("SFTP password regenerated"),y.go("site-detail",{id:String(e)})}catch(l){u.error(l.message),n.disabled=!1,n.innerHTML=o}});let s=async()=>(await p.get(`/sites/${e}/sftp-password`))?.password??"",i=n=>{if(navigator.clipboard)navigator.clipboard.writeText(n).then(()=>u.success("Password copied to clipboard")).catch(()=>u.error("Failed to copy password"));else{let o=document.createElement("textarea");o.value=n,o.style.cssText="position:fixed;opacity:0",document.body.appendChild(o),o.select(),document.execCommand("copy"),document.body.removeChild(o),u.success("Password copied to clipboard")}};t.querySelector("#sftp-reveal-btn")?.addEventListener("click",async()=>{let n=t.querySelector("#sftp-pass-display"),o=t.querySelector("#sftp-reveal-btn");if(!n)return;if(n.dataset.revealed==="1"){n.textContent="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022",n.dataset.revealed="0",o.innerHTML='<span uk-icon="icon: eye; ratio: 0.75"></span>';return}let l=o.innerHTML;o.disabled=!0,o.innerHTML='<div uk-spinner="ratio: 0.5"></div>';try{n.textContent=await s(),n.dataset.revealed="1",o.innerHTML='<span uk-icon="icon: eye-slash; ratio: 0.75"></span>'}catch(r){u.error(r.message),o.innerHTML=l}finally{o.disabled=!1}}),t.querySelector("#sftp-copy-btn")?.addEventListener("click",async()=>{let n=t.querySelector("#sftp-copy-btn"),o=n.innerHTML;n.disabled=!0,n.innerHTML='<div uk-spinner="ratio: 0.5"></div>';try{let l=await s();l&&i(l)}catch(l){u.error(l.message)}finally{n.disabled=!1,n.innerHTML=o}}),t.querySelector("#pma-open-btn")?.addEventListener("click",async()=>{let n=t.querySelector("#pma-open-btn"),o=n.innerHTML;n.disabled=!0,n.innerHTML='<div uk-spinner="ratio: 0.5"></div> Opening...';try{let l=await p.post(`/sites/${e}/pma-token`);window.open(l.url,"_blank")}catch(l){u.error(l.message)}finally{n.disabled=!1,n.innerHTML=o}}),t.querySelector("#sync-pull-btn")?.addEventListener("click",async()=>{if(await gt("pull",a.Name,t.querySelector('[data-action="manage"][data-id="'+a.ParentID+'"]')?.textContent?.trim()??"parent"))try{u.success("Pull from parent complete")}catch(o){u.error(o.message)}}),t.querySelector("#sync-push-btn")?.addEventListener("click",async()=>{if(await gt("push",a.Name,t.querySelector('[data-action="manage"][data-id="'+a.ParentID+'"]')?.textContent?.trim()??"parent"))try{u.success("Push to parent complete")}catch(o){u.error(o.message)}})}function ye(){return`
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
        </div>`}function we(t="",e="",a=301){return`
        <div class="redirect-row uk-flex uk-flex-middle uk-margin-small-bottom" style="gap:8px">
            <input class="uk-input kp-input redirect-source" type="text" placeholder="/old-path" value="${t}" style="flex:1">
            <input class="uk-input kp-input redirect-target" type="text" placeholder="https://example.com/new-path" value="${e}" style="flex:2">
            <select class="uk-select kp-select redirect-code" style="width:90px">
                <option value="301" ${a===301?"selected":""}>301</option>
                <option value="302" ${a===302?"selected":""}>302</option>
                <option value="307" ${a===307?"selected":""}>307</option>
                <option value="308" ${a===308?"selected":""}>308</option>
            </select>
            <a href="javascript:void(0);" class="kp-muted redirect-remove-btn" uk-icon="trash"></a>
        </div>`}async function xe(t){let e=document.getElementById("redirects-list");if(!e)return;e.innerHTML="";let a=await p.get(`/sites/${t}/redirects`);e.innerHTML=a.map(s=>we(s.Source,s.Target,s.Code)).join("")}function Se(t,e){let a=new AbortController,s={signal:a.signal};t.addEventListener("click",i=>{i.target.closest("#redirect-add-btn")&&document.getElementById("redirects-list").insertAdjacentHTML("beforeend",we()),i.target.closest(".redirect-remove-btn")&&i.target.closest(".redirect-row").remove()},s),t.addEventListener("click",async i=>{if(!i.target.closest("#redirect-save-btn"))return;let n=[...document.querySelectorAll(".redirect-row")].map(o=>({Source:o.querySelector(".redirect-source").value.trim(),Target:o.querySelector(".redirect-target").value.trim(),Code:parseInt(o.querySelector(".redirect-code").value,10)}));try{await p.put(`/sites/${e}/redirects`,n),u.success("Redirects saved")}catch(o){u.error(o.message||"Failed to save redirects")}},s),t.__redirectsAbort?.abort(),t.__redirectsAbort=a}var V=[{id:"ab-threshold",key:"threshold",api:"Threshold",mult:1,label:"Error Responses",help:"4xx/5xx responses within the window that trigger the 429."},{id:"ab-window",key:"window_secs",api:"WindowSecs",mult:1,label:"Window (seconds)",help:"Span the error responses are counted over."},{id:"ab-cooldown",key:"cooldown_secs",api:"CooldownSecs",mult:60,label:"429 Cooldown (minutes)",help:"Hitting the limit again during the cooldown converts it to a ban."},{id:"ab-ban",key:"ban_secs",api:"BanSecs",mult:60,label:"Ban Length (minutes)",help:"How long a ban lasts."},{id:"ab-strikes",key:"perm_strikes",api:"PermStrikes",mult:1,label:"Bans Before Permanent",help:"Bans within the strike window that make the ban permanent."},{id:"ab-strike-win",key:"perm_window_secs",api:"PermWindowSecs",mult:3600,label:"Strike Window (hours)",help:"Span the bans are counted over."}],It={id:"ab-escalate",key:"escalate_sites",api:"EscalateSites",mult:1,label:"Sites Before Global Ban",help:"An IP banned on this many sites is banned on all of them."},z=t=>t?`/sites/${t}/security/autoban`:"/security/autoban";function mt(t=null){let e=t?V:[...V,It];return`
        <div id="autoban-panel">

            <div class="kp-card uk-padding-small uk-margin-bottom">
                <ul class="kp-accordion uk-margin-remove" uk-accordion>
                    <li>
                        <a class="uk-accordion-title" href="#"><h3 class="kp-view-title">Auto-Ban Settings</h3></a>
                        <div class="uk-accordion-content">
                            <div class="uk-flex uk-flex-between uk-flex-top uk-margin-small-bottom" style="gap:8px">
                                <p class="kp-muted uk-text-small uk-margin-remove">
                                    ${t?"Counts this site's 4xx/5xx responses per IP. Leave a field blank to inherit the global value shown.":"The global scope counts hits on unregistered domains; per-site counters use these values unless a site overrides them."}
                                    Bypassed and whitelisted IPs are never counted.
                                </p>
                                <button class="uk-button kp-btn-primary kp-btn-sm" id="ab-save" uk-tooltip="Save Auto-Ban Settings">
                                    <span uk-icon="check"></span>
                                </button>
                            </div>
                            ${t?`
                            <div class="uk-margin-small-bottom">
                                <label class="kp-label">
                                    <input class="uk-checkbox" type="checkbox" id="ab-enabled">
                                    &nbsp;Enable auto-ban for this site
                                </label>
                            </div>`:""}
                            <div class="uk-grid-small uk-child-width-1-2@s uk-child-width-1-3@m" uk-grid>
                                ${e.map(a=>`
                                <div>
                                    <label class="kp-label" for="${a.id}">${a.label}</label>
                                    <input class="uk-input kp-input" id="${a.id}" type="number" min="1" step="1">
                                    <p class="kp-muted uk-text-small uk-margin-small-top">${a.help}</p>
                                </div>`).join("")}
                            </div>
                        </div>
                    </li>
                </ul>
            </div>

            <div class="kp-card uk-padding-small">
                <div class="uk-flex uk-flex-between uk-flex-middle uk-margin-small-bottom">
                    <h3 class="kp-view-title">Banned IPs</h3>
                    <button class="uk-button kp-btn-ghost kp-btn-sm" id="ab-refresh" uk-tooltip="Refresh the list">
                        <span uk-icon="refresh"></span>
                    </button>
                </div>
                <div id="ab-list"><span class="kp-muted uk-text-small">Loading\u2026</span></div>
            </div>
        </div>`}function da(t){if(!t.length)return'<p class="kp-muted uk-text-small uk-margin-remove">No IPs are currently banned.</p>';let e=P();return`
        <div class="uk-overflow-auto">
        <table class="uk-table uk-table-divider uk-table-small uk-table-middle kp-fm-table">
            <thead>
                <tr>
                    <th>IP</th>
                    <th>Hits</th>
                    <th>Strikes</th>
                    <th>Banned</th>
                    <th>Expires</th>
                    <th></th>
                </tr>
            </thead>
            <tbody>${t.map(s=>{let i=!s.Expires;return`
        <tr>
            <td class="kp-mono">${g(s.IP)}</td>
            <td>${s.Hits}</td>
            <td>${s.Strikes}</td>
            <td>${new Date(s.Created).toLocaleString()}</td>
            <td>${i?'<span class="kp-muted">Permanent</span>':new Date(s.Expires).toLocaleString()}</td>
            <td>
                <div class="uk-flex uk-flex-right" style="gap:4px">
                    ${i?"":`
                    <button class="uk-button kp-btn-ghost kp-btn-sm" data-ab-action="permanent" data-id="${s.ID}" uk-tooltip="Ban permanently">
                        <span uk-icon="lock"></span>
                    </button>`}
                    ${e?`
                    <button class="uk-button kp-btn-ghost kp-btn-sm" data-ab-action="allow" data-id="${s.ID}" uk-tooltip="Allow \u2014 add to Security Bypass">
                        <span uk-icon="check"></span>
                    </button>`:""}
                    <button class="uk-button kp-btn-danger kp-btn-sm" data-ab-action="remove" data-id="${s.ID}" uk-tooltip="Remove the ban">
                        <span uk-icon="trash"></span>
                    </button>
                </div>
            </td>
        </tr>`}).join("")}</tbody>
        </table>
        </div>`}async function Ct(t,e){let a=t.querySelector("#ab-list");try{let s=await p.get(z(e));a.innerHTML=da(s??[])}catch(s){a.innerHTML=`<p class="kp-muted uk-text-small uk-margin-remove">Failed to load bans: ${g(s.message)}</p>`}}async function ua(t,e){try{let a=await p.get(`${z(e)}/settings`),s=e?a.global:a,i=e?a.override:a;(e?V:[...V,It]).forEach(l=>{let r=t.querySelector(`#${l.id}`);r&&(r.placeholder=String(s[l.api]/l.mult),r.value=i[l.api]==null?"":String(i[l.api]/l.mult))});let o=t.querySelector("#ab-enabled");o&&(o.checked=!!a.override?.Enabled)}catch(a){u.error("Failed to load auto-ban settings: "+a.message)}}async function pa(t,e){let a=e?V:[...V,It],s={};for(let i of a){let n=t.querySelector(`#${i.id}`).value.trim();if(n===""){if(!e)throw new Error(`${i.label} is required`);s[i.key]=null;continue}let o=Number(n);if(!Number.isInteger(o)||o<1)throw new Error(`${i.label} must be a whole number above 0`);s[i.key]=o*i.mult}e&&(s.enabled=t.querySelector("#ab-enabled").checked),await p.put(`${z(e)}/settings`,s)}function kt(t,e=null){let a=t.querySelector("#autoban-panel");a&&(a.querySelector("#ab-save")?.addEventListener("click",async s=>{let i=s.currentTarget,n=i.innerHTML;i.disabled=!0,i.innerHTML='<div uk-spinner="ratio: 0.5"></div>';try{await pa(a,e),u.success("Auto-ban settings saved")}catch(o){u.error(o.message)}finally{i.disabled=!1,i.innerHTML=n}}),a.querySelector("#ab-refresh")?.addEventListener("click",()=>Ct(a,e)),a.querySelector("#ab-list")?.addEventListener("click",async s=>{let i=s.target.closest("[data-ab-action]");if(!i)return;let n=i.dataset.id,o=i.dataset.abAction,l=i.closest("tr")?.querySelector("td")?.textContent??"this IP";try{if(o==="permanent"){if(!await E("Ban Permanently",`Ban ${l} permanently? It stays banned until removed.`))return;await p.post(`${z(e)}/${n}/permanent`),u.success(`${l} banned permanently`)}else if(o==="allow"){if(!await E("Allow IP",`Add ${l} to Security Bypass? It will skip every security check, including the WAF, on all sites.`))return;await p.post(`${z(e)}/${n}/allow`),u.success(`${l} added to Security Bypass`)}else if(o==="remove"){if(!await E("Remove Ban",`Remove the ban on ${l}? Its strike history is cleared too.`))return;await p.delete(`${z(e)}/${n}`),u.success(`Ban on ${l} removed`)}await Ct(a,e)}catch(r){u.error(r.message)}}),ua(a,e),Ct(a,e))}function ma(t){return`
        <!-- tab pills -->
        <ul class="kp-tab-pills" id="kp-waf-pills">
            <li data-tab="crs"><a href="#"><span uk-icon="icon: lifesaver; ratio: 0.85"></span> Core Rule Set</a></li>
            <li data-tab="autoban"><a href="#"><span uk-icon="icon: ban; ratio: 0.85"></span> Auto-Ban</a></li>
        </ul>

        <!-- switcher panels -->
        <ul class="uk-switcher uk-margin-large-bottom" id="kp-waf-switcher">

            <!-- core rule set -->
            <li>
                <div class="kp-card uk-padding">
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
                </div>
            </li>

            <!-- auto-ban -->
            <li>${mt(t)}</li>

        </ul>`}function Bt(t,e,a=null){let s=t.querySelector("#kp-waf-pills"),i=t.querySelector("#kp-waf-switcher");if(!s||!i)return;let n=[...s.querySelectorAll(":scope > li")],o=(l,r)=>{if(UIkit.switcher(i).show(l),n.forEach((h,k)=>h.classList.toggle("kp-pill-active",k===l)),!r)return;let c=n[l].dataset.tab;history.replaceState(null,"",a?`#site-detail/${a}/${c}`:l===0?"#waf":`#waf/${c}`)};n.forEach((l,r)=>{l.querySelector(":scope > a").addEventListener("click",c=>{c.preventDefault(),o(r,!0)})}),o(Math.max(0,n.findIndex(l=>l.dataset.tab===e)),!1)}async function qt(t,e){let a=document.getElementById("waf-tab-panel");if(!a)return;a.innerHTML=ma(t),Bt(a,e,t),kt(a,t);let s=document.getElementById("waf-export-btn");s&&(s.href=`/api/sites/${t}/waf/export`);try{let i=await p.get(`/sites/${t}/waf`),n=document.getElementById("waf-override"),o=document.getElementById("waf-site-exclusions");n&&(n.value=String(i.Override??0)),o&&(o.value=i.Exclusions??"");let l=document.getElementById("waf-plugins-list");if(l){let[r,c]=await Promise.all([p.get("/settings/waf/plugins"),p.get(`/sites/${t}/waf/plugins`)]),h=new Set(c??[]);!r||r.length===0?l.innerHTML='<span class="kp-muted uk-text-small">No plugins found in local CRS install.</span>':window.matchMedia("(max-width: 959px)").matches?l.innerHTML=`
                    <select multiple class="uk-select kp-select waf-plugin-select" size="${Math.min(r.length,8)}">
                        ${r.map(k=>`
                        <option value="${k}" ${h.has(k)?"selected":""}>${k}</option>
                        `).join("")}
                    </select>`:(l.innerHTML=`
                    <div class="waf-plugin-pills">
                        ${r.map(k=>`
                        <span class="waf-plugin-pill ${h.has(k)?"active":""}"
                            data-plugin="${k}">${k}</span>
                        `).join("")}
                    </div>`,l.querySelectorAll(".waf-plugin-pill").forEach(k=>{k.addEventListener("click",()=>k.classList.toggle("active"))}))}}catch(i){u.error("Failed to load WAF settings: "+i.message)}}function $e(t,e,a){t.addEventListener("submit",async s=>{if(s.target.id!=="waf-override-form")return;s.preventDefault();let i=s.target.querySelector('[type="submit"]'),n=i.innerHTML;i.disabled=!0,i.innerHTML='<div uk-spinner="ratio: 0.6"></div> Saving...';let o=new FormData(s.target),l={override:parseInt(o.get("override"),10),exclusions:o.get("exclusions").trim()};try{await p.put(`/sites/${e}/waf`,l);let r=document.querySelector(".waf-plugin-select"),c=r?[...r.selectedOptions].map(h=>h.value):[...document.querySelectorAll(".waf-plugin-pill.active")].map(h=>h.dataset.plugin);await p.put(`/sites/${e}/waf/plugins`,c),u.success("WAF override saved \u2014 engine recompiling in background")}catch(r){u.error(r.message)}finally{i.disabled=!1,i.innerHTML=n}},{signal:a}),t.addEventListener("change",async s=>{if(s.target.id!=="waf-import")return;let i=s.target.files[0];if(!i)return;let n=new FormData;n.append("file",i);try{let o=await fetch(`/api/sites/${e}/waf/import`,{method:"POST",headers:{"X-CSRF-Token":window.KP?.csrf??""},body:n}),l=o.status===204?null:await o.json().catch(()=>null);if(!o.ok)throw new Error(l?.error||`HTTP ${o.status}`);await qt(e),u.success("WAF settings imported")}catch(o){u.error(o.message)}finally{s.target.value=""}},{signal:a})}var ka=[{label:"Cache Flush",cmd:"cache flush"},{label:"Plugin List",cmd:"plugin list"},{label:"Theme List",cmd:"theme list"},{label:"User List",cmd:"user list"},{label:"Core Check",cmd:"core check-update"},{label:"Core Update",cmd:"core update"},{label:"Plugin Updates",cmd:"plugin update --all"},{label:"Theme Updates",cmd:"theme update --all"},{label:"Rewrite Flush",cmd:"rewrite flush"},{label:"Transient Delete",cmd:"transient delete --all"},{label:"Search Replace",cmd:"search-replace '' ''"}];function Ee(t){return`
        <div class="kp-wpcli">
            <div class="kp-log-controls" style="flex-wrap:wrap;gap:6px">
                ${ka.map(e=>`
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
        </div>`}function Le(t,e){let a=t.querySelector("#wpcli-output"),s=t.querySelector("#wpcli-input"),i=t.querySelector("#wpcli-run"),n=t.querySelector("#wpcli-clear"),o=t.querySelector("#wpcli-status"),l=[],r=-1;function c(d,m=""){d.split(`
`).forEach(b=>{if(!b)return;let v=document.createElement("div");m?v.className=m:v.className=b.match(/error|fatal|critical/i)?"kp-log-line-err":b.match(/warning|warn/i)?"kp-log-line-warn":b.match(/success|done\]/i)?"kp-log-line-info":"",v.textContent=b,a.appendChild(v)}),a.scrollTop=a.scrollHeight}function h(d){if(d=d.trim(),!d)return;l.unshift(d),r=-1,c(`wp> ${d}`,"kp-log-line-info"),s.disabled=!0,i.disabled=!0,o&&(o.textContent="Running...");let m=location.protocol==="https:"?"wss":"ws",b=new WebSocket(`${m}://${location.host}/api/sites/${e}/wpcli`);b.onopen=()=>{b.send(JSON.stringify({command:d}))},b.onmessage=v=>{let f=v.data;if(f.trim()==="[done]"){b.close();return}if(f.startsWith("[info]")){c(f,"kp-muted");return}if(f.startsWith("[error]")){c(f,"kp-log-line-err");return}c(f)},b.onerror=()=>{c("[error] WebSocket connection failed","kp-log-line-err")},b.onclose=()=>{s.disabled=!1,i.disabled=!1,o&&(o.textContent="Ready"),s.focus()}}i.addEventListener("click",()=>{h(s.value),s.value=""}),s.addEventListener("keydown",d=>{if(d.key==="Enter"){h(s.value),s.value="",r=-1;return}if(d.key==="ArrowUp"){d.preventDefault(),r<l.length-1&&(r++,s.value=l[r]);return}d.key==="ArrowDown"&&(d.preventDefault(),r>0?(r--,s.value=l[r]):(r=-1,s.value=""))}),t.querySelectorAll('[data-action="wpcli-quick"]').forEach(d=>{d.addEventListener("click",()=>{let m=d.dataset.cmd;if(m.startsWith("search-replace")){s.value=m,s.focus();let b=m.indexOf("''")+1;s.setSelectionRange(b,b);return}h(m)})}),n.addEventListener("click",()=>{a.innerHTML=""});let k=y.go.bind(y);y.go=function(d,m={}){return k(d,m)},s.focus()}var K=null,A=null;function Te(t,e,a){let s=t.querySelector("#kp-site-pills"),i=t.querySelector("#kp-site-switcher"),n=t.querySelector("#kp-manage-pill"),o=t.querySelector("#kp-manage-dropdown");if(!s||!i)return;let l=["#kp-sec-pills","#kp-waf-pills"].map(d=>t.querySelector(d)).filter(Boolean),r=d=>[...i.children].findIndex(m=>m.contains(d));function c(d,m=!1){UIkit.switcher(i).show(d),s.querySelectorAll(":scope > li[data-pill]").forEach(f=>f.classList.remove("kp-pill-active")),m?(n?.classList.add("kp-pill-active"),o?.querySelectorAll("a[data-switcher]").forEach(f=>{f.classList.toggle("kp-dd-active",parseInt(f.dataset.switcher,10)===d)})):(n?.classList.remove("kp-pill-active"),o?.querySelectorAll("a[data-switcher]").forEach(f=>f.classList.remove("kp-dd-active")));let v=l.find(f=>r(f)===d)?.querySelector(":scope > li.kp-pill-active")?.dataset.tab;history.replaceState(null,"",v?`#site-detail/${e}/${v}`:`#site-detail/${e}`)}s.querySelectorAll(":scope > li[data-pill] > a").forEach(d=>{d.addEventListener("click",m=>{m.preventDefault();let b=parseInt(d.closest("li").dataset.pill,10);c(b,!1)})}),n?.querySelector(".kp-pill-dropdown-btn")?.addEventListener("click",d=>{d.stopPropagation(),o.hidden=!o.hidden,n.classList.toggle("kp-pill-active",!o.hidden)}),o?.querySelectorAll("a[data-switcher]").forEach(d=>{d.addEventListener("click",m=>{m.preventDefault(),o.hidden=!0,c(parseInt(d.dataset.switcher,10),!0)})}),document.addEventListener("click",d=>{o&&!n.contains(d.target)&&(o.hidden=!0)},{capture:!0});let k=a?l.find(d=>[...d.children].some(m=>m.dataset.tab===a)):null;k?c(r(k),!0):UIkit.switcher(i).show(1)}function ba(){return`
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
        </div>`}function At(t="",e="",a=!1){return`
        <div class="rp-route-row uk-flex uk-flex-middle uk-margin-small-bottom" style="gap:8px">
            <span>Host:</span><input class="uk-input kp-input" style="flex:1" placeholder="example.com" value="${t}" data-field="domain">
            <span>Upstream:</span><input class="uk-input kp-input" style="flex:2" placeholder="https://10.0.0.1:8080" value="${e}" data-field="upstream">
            <label style="white-space:nowrap;font-size:0.75rem;color:var(--kp-text-dim)" title="Send incoming domain as Host header instead of upstream hostname">
                <input type="checkbox" class="uk-checkbox" data-field="pass_host" ${a?"checked":""}> Pass Host
            </label>
            <button class="uk-button kp-btn-ghost kp-btn-sm rp-remove-row" uk-tooltip="Remove"><span uk-icon="trash"></span></button>
        </div>`}async function ha(t){let e=document.getElementById("rp-routes-list");if(e)try{let a=await p.get(`/sites/${t}/rp-routes`);e.innerHTML=a.length?a.map(s=>At(s.Domain,s.Upstream,s.PassHost)).join(""):At()}catch(a){u.error("Failed to load routes: "+a.message)}}function va(t,e){t.addEventListener("click",async a=>{if(a.target.closest("#rp-add-row")){document.getElementById("rp-routes-list").insertAdjacentHTML("beforeend",At());return}if(a.target.closest(".rp-remove-row")){a.target.closest(".rp-route-row").remove();return}if(!a.target.closest("#rp-save-btn"))return;let s=a.target.closest("#rp-save-btn"),i=s.innerHTML;s.disabled=!0,s.innerHTML='<div uk-spinner="ratio: 0.6"></div> Saving...';let n=[...document.querySelectorAll(".rp-route-row")].map(o=>({Domain:o.querySelector('[data-field="domain"]').value.trim(),Upstream:o.querySelector('[data-field="upstream"]').value.trim(),PassHost:o.querySelector('[data-field="pass_host"]').checked})).filter(o=>o.Domain&&o.Upstream);try{await p.put(`/sites/${e}/rp-routes`,n),u.success("Routes saved")}catch(o){u.error(o.message)}finally{s.disabled=!1,s.innerHTML=i}},{signal:K.signal})}function ga(t){return t.endsWith("-nginx")?"world":t.endsWith("-php")?"code":t.endsWith("-db")?"database":t.endsWith("-redis")?"server":t.endsWith("-varnish")?"grid":t.endsWith("-pma")?"table":t.endsWith("-app")?"laptop":"bolt"}function _e(t){let e=t.split("-").pop();return{nginx:"Nginx",php:"PHP-FPM",db:"MariaDB",redis:"Redis",varnish:"Varnish",pma:"phpMyAdmin",app:"App"}[e]??e}function Mt(t){switch(t){case"healthy":return"var(--kp-success)";case"unhealthy":return"var(--kp-danger)";case"starting":return"var(--kp-warning)";default:return"var(--kp-text-dim)"}}function fa(t){return!t||!t.length?"":t.filter(e=>!e.name.endsWith("-infra")).map(e=>`
            <span class="kp-health-badge"
                data-container="${g(e.name)}"
                title="Restart the Container"
                style="cursor:pointer;color:${Mt(e.status)}">
                <span uk-icon="icon: ${ga(e.name)}; ratio: 1.1"></span>
                <span class="kp-health-badge-label">${g(_e(e.name))}</span>
            </span>
        `).join("")}function ya(t,e){A&&(A.close(),A=null);let a=document.getElementById("sd-health-badges");if(!a)return;let s=location.protocol==="https:"?"wss":"ws";A=new WebSocket(`${s}://${location.host}/api/sites/${e}/health/stream`),A.onmessage=i=>{try{let n=JSON.parse(i.data);a.innerHTML=fa(n),a.querySelectorAll(".kp-health-badge").forEach(o=>{o.addEventListener("click",async()=>{o.style.color=Mt("starting");let l=o.dataset.container,r=l.split("-").pop();try{await p.post(`/sites/${e}/containers/${r}/restart`),u.success(`${_e(l)} restarted`)}catch(c){o.style.color=Mt("none"),u.error(c.message)}})})}catch{}},A.onerror=()=>{},A.onclose=()=>{A=null}}async function Pe(t,{id:e,tab:a}){let[{site:s,domains:i,sftp:n},o,l]=await Promise.all([p.get(`/sites/${e}`),p.get("/sites"),p.get(`/sites/${e}/configs`)]),r=Array.isArray(o)?o:[],c=s.SiteType===1||s.SiteType===2,h=s.SiteType===6,k=[1,2,4,5].includes(s.SiteType);if(K&&K.abort(),K=new AbortController,t.innerHTML=`
        <div class="kp-view-header">
            <div class="uk-flex uk-flex-middle" style="gap:12px">
                <button class="kp-btn-icon" id="sd-back"><span uk-icon="arrow-left"></span></button>
                <div class="kp-site-nav-wrap">
                    <select id="sd-site-nav" class="uk-select kp-select">
                        ${r.map(b=>`<option value="${b.ID}" ${b.ID===s.ID?"selected":""}>${b.Name}</option>`).join("")}
                    </select>
                    <span class="kp-site-nav-arrow">&#9660;</span>
                </div>
                ${h?"":M(s.SiteStatus)}
            </div>
            <div class="uk-flex" style="gap:8px;flex-wrap:wrap">
                ${h?"":`
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
 
        ${h?`
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
            <li>${ba()}</li>
            <li>${yt(e,s.SiteType)}</li>
            <li>${Pt(e,s.SiteType)}</li>
            <li>${G(e)}</li>
            <li id="waf-tab-panel"></li>
            <li>${Lt()}</li>
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
                    ${c?'<a href="#" data-switcher="3"><span uk-icon="icon: code; ratio: 0.85"></span> PHP</a>':""}
                    <a href="#" data-switcher="${c?4:3}"><span uk-icon="icon: database; ratio: 0.85"></span> MariaDB</a>
                    <a href="#" data-switcher="${c?5:4}"><span uk-icon="icon: server; ratio: 0.85"></span> Redis</a>
                    <a href="#" data-switcher="${c?6:5}"><span uk-icon="icon: world; ratio: 0.85"></span> Varnish</a>
                    <hr>
                    <div class="kp-pill-dropdown-section">Security</div>
                    <a href="#" data-switcher="${c?8:7}"><span uk-icon="icon: lock; ratio: 0.85"></span> Security</a>
                    <a href="#" data-switcher="${c?9:8}"><span uk-icon="icon: lifesaver; ratio: 0.85"></span> WAF</a>
                    <a href="#" data-switcher="${c?10:9}"><span uk-icon="icon: user; ratio: 0.85"></span> Basic Auth</a>
                    <hr>
                    <div class="kp-pill-dropdown-section">Tools</div>
                    ${s.SiteType===1?`<a href="#" data-switcher="${c?11:10}"><span uk-icon="icon: file-text; ratio: 0.85"></span> WP-CLI</a>`:""}
                    <a href="#" data-switcher="${s.SiteType===1?c?12:11:c?11:10}"><span uk-icon="icon: history; ratio: 0.85"></span> Backups</a>
                    ${k?`<a href="#" data-switcher="${s.SiteType===1?c?13:12:c?12:11}"><span uk-icon="icon: clock; ratio: 0.85"></span> Crons</a>`:""}
                    <a href="#" data-switcher="${s.SiteType===1?c?14:13:c?13:12}"><span uk-icon="icon: forward; ratio: 0.85"></span> Redirects</a>
                    <a href="#" data-switcher="files"><span uk-icon="icon: folder; ratio: 0.85"></span> Files</a>
                </div>
            </li>
            <li data-pill="1"><a href="#">Stats</a></li>
            <li data-pill="${c?7:6}"><a href="#">Logs</a></li>
        </ul>

        <!-- switcher panels (driven by pills above) -->
        <ul class="uk-switcher" id="kp-site-switcher">
            <li>${he(s,i??[],n,s.ParentID??0,r.find(b=>b.ID===s.ParentID)?.Name??null)}</li>
            <li>${yt(e,s.SiteType)}</li>
            <li>${Z(e,1,l[1])}</li>
            ${c?`<li>${Z(e,2,l[2])}</li>`:""}
            <li>${Z(e,3,l[3])}</li>
            <li>${Z(e,4,l[4])}</li>
            <li>${ee(e,l[5])}</li>
            <li>${Pt(e,s.SiteType)}</li>
            <li>${G(e)}</li>
            <li id="waf-tab-panel"></li>
            <li>${Lt()}</li>
            ${s.SiteType===1?`<li>${Ee(e)}</li>`:""}
            <li>${Zt(e)}</li>
            ${k?`<li>${ne(e)}</li>`:""}
            <li>${ye()}</li>
            <li>${ue(e)}</li>
        </ul>`}`,document.getElementById("sd-back").addEventListener("click",()=>y.go("sites")),document.getElementById("sd-edit").addEventListener("click",()=>Qt(s)),document.getElementById("sd-rename").addEventListener("click",async()=>{let b=await Dt(s.Name);if(!(!b||b===s.Name)){$("Renaming Site","Moving the database, files, and pod \u2014 this may take a few minutes...");try{await p.post(`/sites/${e}/rename`,{name:b},18e5),x(),u.success(`Site renamed to '${b}'`),y.go("site-detail",{id:e})}catch(v){x(),u.error(v.message)}}}),document.getElementById("sd-site-nav")?.addEventListener("change",b=>{y.go("site-detail",{id:b.target.value})}),dt(t),ct(t,a),H(t),me(t,e),$e(t,e,K.signal),qt(e,a),h){va(t,e),ha(e),xt(t,e,s.SiteType),St(e,s.SiteType),Tt(t,e),X(e),Te(t,e,a);return}document.getElementById("sd-recreate").addEventListener("click",async()=>{$("Recreating Pod","Recreating containers for this site...");try{await p.post(`/sites/${e}/recreate`),x(),u.success("Pod recreated"),y.go("site-detail",{id:e})}catch(b){x(),u.error(b.message)}}),document.getElementById("sd-clone")?.addEventListener("click",async()=>{let b=await Ht(s.Name);if(b){$("Cloning Site","Copying files and database \u2014 this may take a few minutes...");try{await p.post(`/sites/${e}/clone`,{name:b},6e5),x(),u.success(`Site cloned as '${b}'`),y.go("sites")}catch(v){x(),u.error(v.message)}}}),ae(t,e,K.signal),ge(t,e),s.SiteType===1&&Le(t,e),fe(t,e,s),te(t,e),j(t,e),k&&(oe(t,e),ut(t,e)),Se(t,e),xe(e);let d=t.querySelector("#kp-site-switcher"),m=t.querySelector('a[data-switcher="files"]');d&&m&&(m.dataset.switcher=String(d.children.length-1)),pe(t,e),C(e),ya(t,e),xt(t,e,s.SiteType),St(e,s.SiteType),Te(t,e,a),Tt(t,e),X(e),be(i??[])}async function bt(t){let e=document.getElementById("totp-qr-img"),a=document.getElementById("totp-qr-wrap");if(!e||!a)return;if(a.querySelectorAll(".totp-uri-text").forEach(i=>i.remove()),typeof QRCode<"u")try{let i=await new Promise((n,o)=>{QRCode.toDataURL(t,{width:220,margin:2},(l,r)=>{l?o(l):n(r)})});e.src=i,e.style.display="";return}catch{}let s=document.createElement("p");s.className="totp-uri-text kp-muted uk-text-small",s.style.wordBreak="break-all",s.textContent=t,a.appendChild(s)}function ht(t){document.getElementById("kp-backup-codes-modal")?.remove();let a=`
        <div id="kp-backup-codes-modal" uk-modal="bg-close:false;esc-close:false">
            <div class="uk-modal-dialog kp-modal uk-modal-body" style="max-width:480px">
                <h3 class="uk-modal-title" style="color:var(--kp-yellow,#f0b429)">
                    <span uk-icon="warning"></span>&nbsp;Save Your Backup Codes
                </h3>
                <p class="kp-muted uk-text-small uk-margin-small-bottom">
                    These codes let you access your account if you lose your authenticator.
                    Each code works <strong>once only</strong>. Keep them somewhere safe.
                </p>
                <div class="kp-backup-codes-grid uk-margin-small">${t.map(i=>`<code class="kp-backup-code">${i}</code>`).join("")}</div>
                <p class="kp-muted uk-text-small uk-margin-small-top">
                    These codes will <strong>not</strong> be shown again.
                </p>
                <div class="uk-flex uk-flex-right uk-margin-top" style="gap:8px">
                    <button id="kp-backup-copy-btn" class="uk-button kp-btn-ghost">Copy All</button>
                    <button id="kp-backup-done-btn" class="uk-button kp-btn-primary">I've Saved These</button>
                </div>
            </div>
        </div>`;document.body.insertAdjacentHTML("beforeend",a);let s=UIkit.modal("#kp-backup-codes-modal");s.show(),document.getElementById("kp-backup-copy-btn").addEventListener("click",()=>{let i=t.join(`
`),n=document.getElementById("kp-backup-copy-btn");if(navigator.clipboard)navigator.clipboard.writeText(i).then(()=>{n.textContent="Copied!"});else{let o=document.createElement("textarea");o.value=i,o.style.cssText="position:fixed;opacity:0",document.body.appendChild(o),o.select();try{document.execCommand("copy"),n.textContent="Copied!"}catch{}o.remove()}}),document.getElementById("kp-backup-done-btn").addEventListener("click",()=>{s.hide(),document.getElementById("kp-backup-codes-modal")?.remove(),y.go("users")})}function Ce(t){document.body.insertAdjacentHTML("beforeend",`
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
        </div>`);let a=UIkit.modal("#kp-create-user-modal");a.show(),document.getElementById("create-user-form").addEventListener("submit",async s=>{s.preventDefault();let i=s.target.querySelector('[type="submit"]'),n=i.innerHTML;i.disabled=!0,i.innerHTML='<div uk-spinner="ratio: 0.6"></div> Creating...';let o=new FormData(s.target),l={fname:o.get("fname").trim(),lname:o.get("lname").trim(),uname:o.get("uname").trim(),email:o.get("email").trim(),phone:o.get("phone").trim(),password:o.get("password"),role:parseInt(o.get("role")),notify_email:o.get("notify_email")==="on",notify_sms:o.get("notify_sms")==="on"};try{let r=F(await p.post("/users",l));document.getElementById("users-table-body").insertAdjacentHTML("beforeend",Rt(r)),u.success(`User '${r.uname}' created`),document.getElementById("create-user-form").style.display="none",document.getElementById("cu-totp-section").style.display="",wa(r.id,a)}catch(r){u.error(r.message),i.disabled=!1,i.innerHTML=n}}),document.getElementById("kp-create-user-modal").addEventListener("hidden",()=>document.getElementById("kp-create-user-modal")?.remove())}function wa(t,e){let a=()=>{e.hide(),document.getElementById("kp-create-user-modal")?.remove(),y.go("users")};document.getElementById("cu-totp-skip-btn").addEventListener("click",a),document.getElementById("cu-totp-setup-btn").addEventListener("click",async()=>{let s=document.getElementById("cu-totp-setup-btn");s.disabled=!0,s.textContent="Setting up\u2026";try{let i=await p.post(`/users/${t}/totp/setup`,{});document.getElementById("totp-secret-text").textContent=i.secret,document.getElementById("totp-setup-area").style.display="",document.getElementById("cu-totp-skip-btn").style.display="none",await bt(i.uri)}catch(i){u.error(i.message),s.disabled=!1,s.textContent="Enable TOTP"}}),document.getElementById("cu-totp-confirm-btn").addEventListener("click",async()=>{let s=document.getElementById("totp-confirm-code").value.trim();if(s.length!==6){u.error("Enter a 6-digit code");return}let i=document.getElementById("cu-totp-confirm-btn");i.disabled=!0;try{let n=await p.post(`/users/${t}/totp/confirm`,{code:s});e.hide(),document.getElementById("kp-create-user-modal")?.remove(),u.success("TOTP enabled"),n.backup_codes?.length?ht(n.backup_codes):y.go("users")}catch(n){u.error(n.message),i.disabled=!1}})}async function Ie(t,e){document.getElementById("kp-edit-user-modal")?.remove();let a;try{a=F(await p.get(`/users/${e}`))}catch(c){u.error(c.message);return}let s=window.KP?.user?.role===99,i=`
        <div id="kp-edit-user-modal" uk-modal>
            <div class="uk-modal-dialog kp-modal uk-modal-body uk-width-large">
                <button class="uk-modal-close-default" type="button" uk-close></button>
                <h3 class="kp-view-title">Edit User \u2014 ${a.uname}</h3>
                <form id="edit-user-form" class="uk-form-stacked uk-margin-top">
                    <div class="uk-grid-small" uk-grid>
                        ${s?`
                        <div class="uk-width-1-1">
                            <label class="kp-label">Username</label>
                            <input class="uk-input kp-input" name="uname" type="text" value="${g(a.uname)}" autocomplete="off">
                        </div>`:""}
                        <div class="uk-width-1-2@s">
                            <label class="kp-label">First Name</label>
                            <input class="uk-input kp-input" name="fname" type="text" value="${g(a.fname)}" required>
                        </div>
                        <div class="uk-width-1-2@s">
                            <label class="kp-label">Last Name</label>
                            <input class="uk-input kp-input" name="lname" type="text" value="${g(a.lname)}" required>
                        </div>
                        <div class="uk-width-1-2@s">
                            <label class="kp-label">Email</label>
                            <input class="uk-input kp-input" name="email" type="email" value="${g(a.email)}" required>
                        </div>
                        <div class="uk-width-1-2@s">
                            <label class="kp-label">Phone</label>
                            <input class="uk-input kp-input" name="phone" type="tel" value="${g(a.phone||"")}" required>
                        </div>
                        <div class="uk-width-1-1">
                            <label class="kp-label uk-margin-small-bottom">Notifications</label>
                            <div class="uk-flex" style="gap:24px">
                                <label><input class="uk-checkbox" type="checkbox" name="notify_email" ${a.notify_email?"checked":""}> &nbsp;Email</label>
                                <label><input class="uk-checkbox" type="checkbox" name="notify_sms" ${a.notify_sms?"checked":""}> &nbsp;SMS</label>
                            </div>
                        </div>
                        ${s?`
                        <div class="uk-width-1-2@s">
                            <label class="kp-label">Role</label>
                            <select class="uk-select kp-select" name="role">
                                <option value="50" ${a.role===50?"selected":""}>Manager</option>
                                <option value="99" ${a.role===99?"selected":""}>Admin</option>
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
                    ${a.totp_enabled?`<div class="uk-flex uk-flex-middle" style="gap:12px">
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
        </div>`;document.body.insertAdjacentHTML("beforeend",i);let n=UIkit.modal("#kp-edit-user-modal");n.show(),document.getElementById("edit-user-form").addEventListener("submit",async c=>{c.preventDefault();let h=c.target.querySelector('[type="submit"]'),k=h.innerHTML;h.disabled=!0,h.innerHTML='<div uk-spinner="ratio: 0.6"></div> Saving...';let d=new FormData(c.target),m={fname:d.get("fname").trim(),lname:d.get("lname").trim(),email:d.get("email").trim(),phone:d.get("phone").trim(),notify_email:d.get("notify_email")==="on",notify_sms:d.get("notify_sms")==="on"};if(s){m.role=parseInt(d.get("role"));let v=d.get("uname");v&&(m.uname=v.trim())}let b=d.get("password");b&&(m.password=b),Number(e)===Number(window.KP?.user?.id)&&document.getElementById("edit-user-current-pw")?.removeAttribute("hidden");try{await p.put(`/users/${e}`,m),n.hide(),document.getElementById("kp-edit-user-modal")?.remove(),u.success("User updated"),y.go("users")}catch(v){u.error(v.message),h.disabled=!1,h.innerHTML=k}});let o=document.getElementById("totp-setup-btn");o&&o.addEventListener("click",async()=>{o.disabled=!0,o.textContent="Setting up\u2026";try{let c=await p.post(`/users/${e}/totp/setup`,{});document.getElementById("totp-secret-text").textContent=c.secret,document.getElementById("totp-setup-area").style.display="",await bt(c.uri)}catch(c){u.error(c.message),o.disabled=!1,o.textContent="Enable TOTP"}});let l=document.getElementById("totp-confirm-btn");l&&l.addEventListener("click",async()=>{let c=document.getElementById("totp-confirm-code").value.trim();if(c.length!==6){u.error("Enter a 6-digit code");return}l.disabled=!0;try{let h=await p.post(`/users/${e}/totp/confirm`,{code:c});n.hide(),document.getElementById("kp-edit-user-modal")?.remove(),u.success("TOTP enabled"),h.backup_codes?.length?ht(h.backup_codes):y.go("users")}catch(h){u.error(h.message),l.disabled=!1}});let r=document.getElementById("totp-disable-btn");r&&r.addEventListener("click",async()=>{r.disabled=!0;try{await p.delete(`/users/${e}/totp`),u.success("TOTP disabled"),n.hide(),document.getElementById("kp-edit-user-modal")?.remove(),y.go("users")}catch(c){u.error(c.message),r.disabled=!1}}),document.getElementById("kp-edit-user-modal").addEventListener("hidden",()=>document.getElementById("kp-edit-user-modal")?.remove())}async function Be(t){if(!P()){t.innerHTML=T("Access denied");return}let e=await p.get("/users");t.innerHTML=`
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
                    ${e.map(a=>Rt(F(a))).join("")}
                </tbody>
            </table>
            </div>
        </div>`,document.getElementById("users-new-btn").addEventListener("click",()=>Ce(t)),xa(t)}function Rt(t){let e=t.role===99?'<span class="kp-badge kp-badge-admin">Admin</span>':'<span class="kp-badge kp-badge-manager">Manager</span>',a=[t.notify_email?'<span uk-icon="icon: mail; ratio: 0.85" uk-tooltip="Email notifications on" style="color:var(--kp-success)"></span>':'<span uk-icon="icon: mail; ratio: 0.85" style="color:var(--kp-text-dim)" uk-tooltip="Email notifications off"></span>',t.notify_sms?'<span uk-icon="icon: receiver; ratio: 0.85" uk-tooltip="SMS notifications on" style="color:var(--kp-success)"></span>':'<span uk-icon="icon: receiver; ratio: 0.85" style="color:var(--kp-text-dim)" uk-tooltip="SMS notifications off"></span>'].join(" ");return`<tr data-user-id="${t.id}">
        <td><strong>${g(t.fname)} ${g(t.lname)}</strong></td>
        <td><span style="font-family:monospace">${g(t.uname)}</span></td>
        <td>${g(t.email)}</td>
        <td>${e}</td>
        <td class="uk-text-center">${t.totp_enabled?'<span uk-icon="icon: check; ratio: 0.9" style="color:var(--kp-success)"></span>':'<span uk-icon="icon: close; ratio: 0.9" style="color:var(--kp-text-dim)"></span>'}</td>
        <td class="uk-text-center">${a}</td>
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
    </tr>`}function xa(t){t.addEventListener("click",async e=>{let a=e.target.closest('[data-action="delete-user"]');if(!(!a||!await E("Delete User","Delete this user? This cannot be undone.")))try{await p.delete(`/users/${a.dataset.uid}`),a.closest("tr").remove(),u.success("User deleted")}catch(i){u.error(i.message)}}),t.addEventListener("click",async e=>{let a=e.target.closest('[data-action="edit-user"]');a&&Ie(t,a.dataset.uid)})}async function qe(t,e={}){if(!P()){t.innerHTML=T("Access denied");return}t.innerHTML=`
        <div class="kp-view-header">
            <h1 class="kp-view-title kp-cursor" style="font-size:2rem;">Global WAF</h1>
        </div>
        <p class="kp-muted uk-text-small uk-margin-bottom">
            Global WAF settings apply to all sites. Per-site overrides are set on each site's WAF tab.
        </p>

        <!-- tab pills -->
        <ul class="kp-tab-pills" id="kp-waf-pills">
            <li data-tab="crs"><a href="#"><span uk-icon="icon: lifesaver; ratio: 0.85"></span> Core Rule Set</a></li>
            <li data-tab="autoban"><a href="#"><span uk-icon="icon: ban; ratio: 0.85"></span> Auto-Ban</a></li>
        </ul>

        <!-- switcher panels -->
        <ul class="uk-switcher uk-margin-large-bottom" id="kp-waf-switcher">

            <!-- core rule set -->
            <li>
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
            </li>

            <!-- auto-ban -->
            <li>${mt()}</li>

        </ul>`,Sa(t),Bt(t,e.tab),Ae(t),kt(t)}async function Ae(t){try{let e=await p.get("/settings/waf");if(!t.querySelector("#sec-waf-enabled"))return;t.querySelector("#sec-waf-enabled").checked=!!e.Enabled,t.querySelector("#sec-waf-audit").checked=!!e.AuditLog,t.querySelector("#sec-waf-mode").value=String(e.Mode??0),t.querySelector("#sec-waf-paranoia").value=String(e.ParanoiaLevel??1),t.querySelector("#sec-waf-exclusions").value=e.Exclusions??""}catch(e){u.error("Failed to load WAF settings: "+e.message)}}function Sa(t){t.querySelector("#sec-waf-save")?.addEventListener("click",async()=>{let e=t.querySelector("#sec-waf-save"),a=e.innerHTML;e.disabled=!0,e.innerHTML='<div uk-spinner="ratio: 0.5"></div>';try{await p.put("/settings/waf",{enabled:t.querySelector("#sec-waf-enabled").checked,mode:parseInt(t.querySelector("#sec-waf-mode").value,10),paranoia_level:parseInt(t.querySelector("#sec-waf-paranoia").value,10),audit_log:t.querySelector("#sec-waf-audit").checked,exclusions:t.querySelector("#sec-waf-exclusions").value.trim()}),u.success("WAF settings saved \u2014 engine recompiling in background")}catch(s){u.error(s.message)}finally{e.disabled=!1,e.innerHTML=a}}),t.querySelector("#sec-waf-import")?.addEventListener("change",async e=>{let a=e.target.files[0];if(!a)return;let s=new FormData;s.append("file",a);try{let i=await fetch("/api/settings/waf/import",{method:"POST",headers:{"X-CSRF-Token":window.KP?.csrf??""},body:s}),n=i.status===204?null:await i.json().catch(()=>null);if(!i.ok)throw new Error(n?.error||`HTTP ${i.status}`);await Ae(t),u.success("WAF settings imported")}catch(i){u.error(i.message)}finally{e.target.value=""}})}y.register("dashboard",t=>Kt(t));y.register("sites",t=>zt(t));y.register("site-detail",(t,e)=>Pe(t,e));y.register("users",t=>Be(t));y.register("settings",(t,e)=>Et(t,e));y.register("security",(t,e)=>Jt(t,e));y.register("waf",(t,e)=>qe(t,e));y.register("admin-logs",t=>Ft(t));y.register("audit-log",t=>jt(t));document.addEventListener("keydown",t=>{let e=t.target;e?.matches?.("input, textarea, select, [contenteditable='true']")&&(e.closest?.(".CodeMirror")||e.id==="wpcli-input"&&(t.key==="ArrowUp"||t.key==="ArrowDown")||["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","Home","End"].includes(t.key)&&t.stopPropagation())},!0);document.addEventListener("click",t=>{let e=t.target.closest("[data-view]");e&&(t.preventDefault(),y.go(e.dataset.view))});document.addEventListener("click",async t=>{let e=t.target.closest("[data-action]");if(!e)return;t.stopPropagation();let{action:a,id:s}=e.dataset;switch(a){case"manage":y.go("site-detail",{id:s});break;case"start":await vt(s,"start","Starting Site","Starting all containers - please wait...");break;case"stop":await vt(s,"stop","Stopping Site","Gracefully stopping all containers - please wait...");break;case"restart":await vt(s,"restart","Restarting Site","Restarting all containers - please wait...");break;case"flush":await vt(s,"flush","Flushing Caches","Clearing container caches - please wait...");break;case"delete":await $a(s);break;case"recreate":$("Recreating Pod","Recreating containers for this site - this may take a few minutes...");try{await p.post(`/sites/${s}/recreate`),x(),u.success("Pod recreated"),y.go("sites")}catch(i){x(),u.error(i.message)}break}});document.addEventListener("kp:bulk-action",async t=>{let{action:e,ids:a}=t.detail;if(!a.length)return;let s={start:"Starting",stop:"Stopping",restart:"Restarting",flush:"Flushing Caches",recreate:"Recreating"},i=e==="recreate"?"Please hold while we update your Pods":"Please wait...",n=e==="recreate"?{prune:!0}:void 0,o=e==="recreate"?1200*1e3:void 0;$(`${s[e]} ${a.length} Site${a.length!==1?"s":""}`,i);let l=await Promise.allSettled(a.map(c=>p.post(`/sites/${c}/${e}`,n,o)));x();let r=l.filter(c=>c.status==="rejected").length;r===0?u.success(`${e.charAt(0).toUpperCase()+e.slice(1)} complete for ${a.length} site${a.length!==1?"s":""}`):u.error(`${r} of ${a.length} sites failed \u2014 check logs`),["start","stop","restart","recreate"].includes(e)&&y.go("sites")});async function vt(t,e,a,s){$(a,s);try{if(await p.post(`/sites/${t}/${e}`),x(),u.success(a+" complete"),e!=="flush"){let{view:i,params:n}=nt();y.go(i,n)}}catch(i){x(),u.error(i.message)}}async function $a(t){if(!await E("Delete Site",`This will stop and permanently remove the pod and all its data. Are you sure?

A final backup will be created before deletion. This may take a moment.`))return;$("Deleting Site","Creating final backup and removing the pod \u2014 please wait...");let a;try{a=await fetch(`/api/sites/${t}`,{method:"DELETE",headers:{"X-CSRF-Token":window.KP?.csrf??""}})}catch{}if(x(),a?.ok&&a.headers.get("Content-Type")?.includes("gzip")){let o=(a.headers.get("Content-Disposition")??"").match(/filename="([^"]+)"/)?.[1]??`${t}_final.tar.gz`,l=await a.blob(),r=document.createElement("a");r.href=URL.createObjectURL(l),r.download=o,r.click(),URL.revokeObjectURL(r.href),u.success("Site deleted. Final backup downloaded."),y.go("sites");return}let s=!1,i=0;for(;!s&&i<10;){try{await new Promise(o=>setTimeout(o,2e3)),s=!(await p.get("/sites")).find(o=>o.ID===parseInt(t))}catch{}i++}s?(u.success("Site deleted. Final backup saved to S3."),y.go("sites")):u.error("Delete failed - site still exists after 20s")}if(window.KP?.user?.role===99){let t=document.getElementById("kp-resource-warning"),e=document.getElementById("kp-resource-warning-msg"),a=async()=>{try{let s=await p.get("/settings/resource-warning");s?.active&&t&&e?(e.textContent=`${s.current_mb}MB used, threshold ${s.threshold_mb}MB \u2014 throttling ${s.offender}.`,t.style.display=""):t&&(t.style.display="none")}catch{}};a(),setInterval(a,3e4)}window.addEventListener("hashchange",()=>{if(y._ownHashChange)return;let{view:t,params:e}=nt();y.go(t,e)});(()=>{let t=document.getElementById("kp-totop");if(!t)return;let e=()=>{t.classList.toggle("is-visible",window.scrollY>150)};window.addEventListener("scroll",e,{passive:!0}),e(),t.addEventListener("click",()=>{window.scrollTo({top:0,behavior:"smooth"})})})();(()=>{let t=document.querySelectorAll(".kp-logout-link");t.length&&t.forEach(e=>{e.addEventListener("click",async a=>{a.preventDefault(),await fetch("/logout",{method:"POST",headers:{"X-CSRF-Token":window.KP?.csrf??""}}),window.location.href="/login"})})})();var{view:Ea,params:La}=nt();y.go(Ea,La);})();
