/*! PodNest - Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com> | MIT License */

"use strict";(()=>{var m={async _req(t,e,a,s=6e4){let i=new AbortController,n=setTimeout(()=>i.abort(),s),r={method:t,headers:{"Content-Type":"application/json"},signal:i.signal};t!=="GET"&&t!=="HEAD"&&(r.headers["X-CSRF-Token"]=window.KP?.csrf??""),a!==void 0&&(r.body=JSON.stringify(a));try{let l=await fetch("/api"+e,r);clearTimeout(n);let o=l.status===204?null:await l.json().catch(()=>null);if(l.status===401)return window.location.href="/login?msg=Your+session+has+expired+%E2%80%94+please+log+in+again",null;if(!l.ok)throw new Error(o?.error||`HTTP ${l.status}`);return o}catch(l){throw clearTimeout(n),l}},get:t=>m._req("GET",t),post:(t,e,a)=>m._req("POST",t,e,a),put:(t,e,a)=>m._req("PUT",t,e,a),delete:t=>m._req("DELETE",t),patch:(t,e)=>m._req("PATCH",t,e)};var S=t=>String(t).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");function E(t){return t===0?"0 B":t<1024?`${t} B`:t<1048576?`${(t/1024).toFixed(1)} KB`:t<1073741824?`${(t/1048576).toFixed(1)} MB`:`${(t/1073741824).toFixed(2)} GB`}var Z=()=>'<div class="kp-spinner"><div uk-spinner="ratio: 1.25"></div></div>',_=t=>`<div class="kp-empty">
        <div class="kp-empty-icon" uk-icon="icon: warning; ratio: 2.5"></div>
        <div class="kp-empty-text">${t}</div>
    </div>`,tt=(t,e)=>`<div class="kp-empty">
        <div class="kp-empty-icon" uk-icon="icon: ${t}; ratio: 2.5"></div>
        <div class="kp-empty-text">${e}</div>
    </div>`,A=t=>{let e={1:["running","Running"],2:["stopped","Stopped"],3:["restarting","Restarting"],4:["error","Error"]},[a,s]=e[t]||["stopped","Unknown"];return`<span class="kp-status kp-status-${a}">${s}</span>`},we=t=>({3:"8.2",4:"8.3",5:"8.4",6:"8.5"})[t]||"?",O=t=>({1:"WordPress",2:"PHP",3:"Static",4:"Node.js",5:".NET",6:"Reverse Proxy"})[t]||"?",q=()=>window.KP.user.role===window.KP.roles.admin,D=t=>{switch(t.SiteType){case 1:case 2:return`PHP ${we(t.PHPVersion)}`;case 4:return`Node ${{2:"22",4:"24",5:"25",6:"26"}[t.RuntimeVersion]||"?"}`;case 5:return`.NET ${{1:"8.0",2:"9.0",3:"10.0"}[t.RuntimeVersion]||"?"}`;case 6:return"Reverse Proxy";default:return""}},F=t=>({id:t.id??t.ID,uname:t.uname??t.UName,uhash:t.uhash??t.UHash,fname:t.fname??t.FName,lname:t.lname??t.LName,email:t.email??t.Email,phone:t.phone??t.Phone,role:t.role??t.Role,totp_enabled:t.totp_enabled??!1,notify_email:t.notify_email??!1,notify_sms:t.notify_sms??!1,created:t.created??t.Created});function L(t,e){return new Promise(a=>{document.getElementById("kp-confirm-title").textContent=t,document.getElementById("kp-confirm-message").textContent=e;let s=UIkit.modal("#kp-confirm-modal");document.getElementById("kp-confirm-ok").addEventListener("click",()=>{s.hide(),a(!0)},{once:!0}),s.show(),document.getElementById("kp-confirm-modal").addEventListener("hidden",()=>a(!1),{once:!0})})}function $(t,e){let a=`
        <div id="kp-progress-modal" uk-modal="bg-close: false; esc-close: false; keyboard: false">
            <div class="uk-modal-dialog kp-modal uk-modal-body uk-text-center" style="max-width:420px">
                <div uk-spinner="ratio: 1.5" style="color:var(--kp-blue)"></div>
                <h3 class="uk-modal-title uk-margin-small-top" id="kp-progress-title">${t}</h3>
                <p class="kp-muted uk-text-small" id="kp-progress-message">${e}</p>
                <p class="kp-muted">
                    This may take several minutes while the task(s) complete, make sure to keep screen open until it has completed.
                </p>
            </div>
        </div>`;document.body.insertAdjacentHTML("beforeend",a),UIkit.modal("#kp-progress-modal").show()}function w(){let t=document.getElementById("kp-progress-modal");t&&(UIkit.modal(t).hide(),setTimeout(()=>t.remove(),300))}function et(t){return new Promise(e=>{let a="kp-clone-modal",s=`
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
            </div>`;document.body.insertAdjacentHTML("beforeend",s);let i=UIkit.modal(`#${a}`),n=document.getElementById("kp-clone-name"),r=document.getElementById("kp-clone-ok"),l=document.getElementById("kp-clone-cancel"),o=d=>{i.hide(),setTimeout(()=>document.getElementById(a)?.remove(),300),e(d)};r.addEventListener("click",()=>o(n.value.trim()||null),{once:!0}),l.addEventListener("click",()=>o(null),{once:!0}),document.getElementById(a).addEventListener("hidden",()=>o(null),{once:!0}),i.show(),setTimeout(()=>n.focus(),150),n.addEventListener("keydown",d=>{d.key==="Enter"&&r.click()})})}function mt(t,e,a){return new Promise(s=>{let i="kp-sync-modal",n=t==="pull",r=n?"Pull From Parent":"Push To Parent",l=n?"cloud-download":"cloud-upload",o=n?a:e,d=n?e:a,u=`
            <div id="${i}" uk-modal>
                <div class="uk-modal-dialog kp-modal uk-modal-body" style="max-width:460px">
                    <h3 class="uk-modal-title">${r}</h3>
                    <p class="kp-muted uk-text-small uk-margin-small-bottom">
                        This will overwrite all files and database content on
                        <strong>${d}</strong> with data from <strong>${o}</strong>.
                        This action cannot be undone.
                    </p>
                    <p class="kp-muted uk-text-small" style="color:var(--kp-red, #e05c5c)">
                        <span uk-icon="icon: warning; ratio: 0.85"></span>
                        <strong>${d}</strong> will be temporarily unavailable during the sync.
                    </p>
                    <div class="uk-flex uk-flex-right uk-margin-top" style="gap:8px">
                        <button class="uk-button kp-btn-ghost uk-modal-close" id="kp-sync-cancel">Cancel</button>
                        <button class="uk-button kp-btn-primary" id="kp-sync-ok">
                            <span uk-icon="${l}"></span> ${r}
                        </button>
                    </div>
                </div>
            </div>`;document.body.insertAdjacentHTML("beforeend",u);let v=UIkit.modal(`#${i}`),k=document.getElementById("kp-sync-ok"),p=document.getElementById("kp-sync-cancel"),b=g=>{v.hide(),setTimeout(()=>document.getElementById(i)?.remove(),300),s(g)};k.addEventListener("click",()=>b(!0),{once:!0}),p.addEventListener("click",()=>b(!1),{once:!0}),document.getElementById(i).addEventListener("hidden",()=>b(!1),{once:!0}),v.show()})}var f={routes:{},_ownHashChange:!1,register(t,e){this.routes[t]=e},async go(t,e={}){let a=Object.keys(e).length?t+"/"+Object.values(e).join("/"):t;this._ownHashChange=!0,window.location.hash=a,setTimeout(()=>{this._ownHashChange=!1},0),document.querySelectorAll(".kp-nav-link").forEach(n=>{n.classList.toggle("kp-active",n.dataset.view===t)}),document.querySelectorAll(".kp-bn-item[data-view]").forEach(n=>{n.classList.toggle("kp-active",n.dataset.view===t)});let s=this.routes[t];if(!s)return;let i=document.getElementById("kp-view");i.innerHTML=Z();try{await s(i,e)}catch(n){i.innerHTML=_(n.message)}}};function kt(){let e=(window.location.hash.replace("#","")||"dashboard").split("/"),a=e[0],s={};return a==="site-detail"&&e[1]&&(s.id=e[1]),{view:a,params:s}}var c={show(t,e="info",a=7e3){let s={success:"check",error:"warning",info:"info"},i=document.createElement("div");i.className=`kp-toast kp-toast-${e}`,i.innerHTML=`<span uk-icon="${s[e]||"info"}"></span><span>${S(t)}</span>`,document.getElementById("kp-toasts").appendChild(i),UIkit.icon(i.querySelector("[uk-icon]")),setTimeout(()=>i.remove(),a)},success:t=>c.show(t,"success"),error:t=>c.show(t,"error"),info:t=>c.show(t,"info")};async function at(t){let e=`
        <div id="kp-edit-site-modal" uk-modal>
            <div class="uk-modal-dialog kp-modal uk-modal-body uk-width-large">
                <button class="uk-modal-close-default" type="button" uk-close></button>
                <h3 class="kp-view-title">Edit Site \u2014 ${t.Name}</h3>
                <form id="edit-site-form" class="uk-form-stacked uk-margin-top">
                    <div class="uk-grid-small" uk-grid>
                        <div class="uk-width-1-2@s">
                            <label class="kp-label">Site Name</label>
                            <input class="uk-input kp-input" name="name" type="text" value="${t.Name}" required>
                        </div>
                        <div class="uk-width-1-2@s">
                            <label class="kp-label">Site Type</label>
                            <select class="uk-select kp-select" name="site_type" id="es-site-type">
                                <option value="1" ${t.SiteType===1?"selected":""}>PHP</option>
                                <option value="3" ${t.SiteType===3?"selected":""}>Static HTML</option>
                                <option value="4" ${t.SiteType===4?"selected":""}>Node.js</option>
                                <option value="5" ${t.SiteType===5?"selected":""}>.NET</option>
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
        </div>`;document.body.insertAdjacentHTML("beforeend",e);let a=UIkit.modal("#kp-edit-site-modal"),s=document.getElementById("es-site-type"),i=document.getElementById("es-php-version-wrap"),n=document.getElementById("es-node-version-wrap"),r=document.getElementById("es-dotnet-version-wrap"),l=document.getElementById("es-start-command-wrap"),o=document.getElementById("es-wordpress-wrap");a.show();let d=u=>{i.classList.toggle("uk-hidden",u!==1&&u!==2||u===6),n.classList.toggle("uk-hidden",u!==4),r.classList.toggle("uk-hidden",u!==5),l.classList.toggle("uk-hidden",u!==4&&u!==5),o.classList.toggle("uk-hidden",u!==1)};d(t.SiteType),s.addEventListener("change",()=>d(parseInt(s.value))),document.getElementById("edit-site-form").addEventListener("submit",async u=>{u.preventDefault();let v=u.target.querySelector('[type="submit"]'),k=v.innerHTML;v.disabled=!0,v.innerHTML='<div uk-spinner="ratio: 0.6"></div> Saving...';let p=new FormData(u.target),b=parseInt(p.get("site_type")),g=null;b===4&&(g=parseInt(p.get("node_version"))),b===5&&(g=parseInt(p.get("dotnet_version")));let h={name:p.get("name").trim(),php_version:parseInt(p.get("php_version"))||3,site_type:b,runtime_version:g,start_command:p.get("start_command")?.trim()||""},y=b===1?p.get("install_wordpress")==="on":!1;try{if(await m.put(`/sites/${t.ID}`,h),a.hide(),document.getElementById("kp-edit-site-modal")?.remove(),b!==6){$("Applying Changes","Saving changes and recreating pod...");try{await m.post(`/sites/${t.ID}/recreate`,{install_wordpress:y}),w(),c.success("Site updated and pod recreated")}catch(x){w(),c.error("Site saved but pod recreate failed: "+x.message)}}else c.success("Site updated");f.go("site-detail",{id:String(t.ID)})}catch(x){c.error(x.message),v.disabled=!1,v.innerHTML=k}}),document.getElementById("kp-edit-site-modal").addEventListener("hidden",()=>document.getElementById("kp-edit-site-modal")?.remove())}var xe=2e3;function Se(){return`
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
        </div>`}function $e(t){let e=null,a=!1,s=t.querySelector("#admin-log-output"),i=t.querySelector("#admin-log-connect"),n=t.querySelector("#admin-log-disconnect"),r=t.querySelector("#admin-log-clear"),l=t.querySelector("#admin-log-autoscroll"),o=t.querySelector("#admin-log-status");function d(k){for(k.split(`
`).forEach(p=>{if(!p)return;let b=document.createElement("div");b.className=p.match(/WAF BLOCK/i)?"kp-log-line-err":p.match(/WAF DETECT/i)?"kp-log-line-warn":p.match(/error|crit|emerg/i)?"kp-log-line-err":p.match(/warn/i)?"kp-log-line-warn":p.match(/info|notice/i)?"kp-log-line-info":"",b.textContent=p,s.appendChild(b)});s.childElementCount>xe;)s.removeChild(s.firstChild);l.checked&&(s.scrollTop=s.scrollHeight)}function u(){e&&(e.close(),e=null),a=!1,i.disabled=!1,n.disabled=!0,o&&(o.textContent="Disconnected")}i.addEventListener("click",()=>{u();let k=t.querySelector("#admin-log-source").value,p=t.querySelector("#admin-log-tail").value,b=location.protocol==="https:"?"wss":"ws",g=k==="waf"?`${b}://${location.host}/api/logs/waf?tail=${p}`:`${b}://${location.host}/api/logs/proxy?tail=${p}`;e=new WebSocket(g),e.onopen=()=>{a=!0,i.disabled=!0,n.disabled=!1,o&&(o.textContent=`Connected \u2014 ${k==="waf"?"WAF Log":"Proxy Access Log"}`)},e.onmessage=h=>d(h.data),e.onerror=()=>{},e.onclose=()=>{a=!1,i.disabled=!1,n.disabled=!0,o&&(o.textContent="Disconnected")}}),n.addEventListener("click",u),r.addEventListener("click",()=>{s.innerHTML=""}),t.querySelector("#admin-log-source").addEventListener("change",()=>{e&&e.readyState===WebSocket.OPEN&&(u(),i.click())});let v=f.go.bind(f);f.go=function(k,p={}){return e&&u(),v(k,p)}}function _t(t){t.innerHTML=Se(),$e(t)}var nt=50;function Le(t,e,a){let s=Math.max(1,Math.ceil(t.total/nt)),i=(t.entries??[]).map(Ct).join("")||'<tr><td colspan="8" class="uk-text-center" style="color:var(--kp-text-dim)">No records found</td></tr>';return`
        <div id="audit-log-panel">
            <div class="kp-view-header">
                <h1 class="kp-view-title" style="font-size:2rem;">Audit Log</h1>
            </div>

            <div class="kp-card uk-padding-small uk-margin-bottom">
                <div class="uk-flex uk-flex-middle uk-flex-wrap kp-filter-bar">
                    <input class="uk-input kp-input" id="al-filter-user" type="text"
                        placeholder="Username" value="${T(e.username)}">
                    <input class="uk-input kp-input" id="al-filter-action" type="text"
                        placeholder="Action" value="${T(e.action)}">
                    <input class="uk-input kp-input" id="al-filter-target" type="text"
                        placeholder="Target type" value="${T(e.target_type)}">
                    <input class="uk-input kp-input" id="al-filter-date-from" type="date"
                        value="${T(e.date_from)}">
                    <input class="uk-input kp-input" id="al-filter-date-to" type="date"
                        value="${T(e.date_to)}">
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

            ${s>1?`<div id="al-pager">${Pt(a,s)}</div>`:'<div id="al-pager"></div>'}
        </div>`}function Ct(t){let e=new Date(t.ts).toLocaleString(),a=t.username?`<span style="font-family:monospace">${T(t.username)}</span>`:'<span style="color:var(--kp-text-dim)">\u2014</span>',s=Ee(t.status),n=t.prior_state||t.new_state?`<button class="uk-button kp-btn-ghost kp-btn-sm al-diff-btn"
                data-prior="${T(t.prior_state)}" data-new="${T(t.new_state)}">
               <span uk-icon="icon: git-fork; ratio: 0.85"></span>
           </button>`:"<span>\u2014</span>",r=t.details?`<button class="uk-button kp-btn-ghost kp-btn-sm al-diff-btn"
                data-prior="" data-new="${T(t.details)}">
               <span uk-icon="icon: info; ratio: 0.85"></span>
           </button>`:"<span>\u2014</span>";return`<tr>
        <td style="white-space:nowrap;font-size:0.82rem">${e}</td>
        <td>${a}</td>
        <td style="font-family:monospace;font-size:0.82rem">${T(t.ip)}</td>
        <td><span class="kp-badge">${T(t.method)}</span></td>
        <td style="font-family:monospace;font-size:0.82rem">${T(t.action)}</td>
        <td>${s}</td>
        <td>${r}</td>
        <td>${n}</td>
    </tr>`}function Pt(t,e){let a=t>1?'<button class="uk-button kp-btn-ghost kp-btn-sm" id="al-prev">\u2039 Prev</button>':"",s=t<e?'<button class="uk-button kp-btn-ghost kp-btn-sm" id="al-next">Next \u203A</button>':"";return`<div class="uk-flex uk-flex-middle uk-flex-center uk-margin-small-top" style="gap:12px">
        ${a}
        <span style="font-size:0.85rem;color:var(--kp-text-dim)">Page ${t} of ${e}</span>
        ${s}
    </div>`}function Ee(t){return`<span class="kp-badge ${t>=500?"kp-badge-error":t>=400?"kp-badge-warn":t>=300?"kp-badge-info":"kp-badge-ok"}">${t}</span>`}var T=t=>S(t??"");async function It(t,e){let a=new URLSearchParams({page:e,page_size:nt});return t.username&&a.set("username",t.username),t.action&&a.set("action",t.action),t.target_type&&a.set("target_type",t.target_type),t.date_from&&a.set("date_from",t.date_from),t.date_to&&a.set("date_to",t.date_to),t.auth!==""&&a.set("auth",t.auth),m.get(`/audit?${a}`)}function Te(t){return{username:t.querySelector("#al-filter-user").value.trim(),action:t.querySelector("#al-filter-action").value.trim(),target_type:t.querySelector("#al-filter-target").value.trim(),date_from:t.querySelector("#al-filter-date-from").value,date_to:t.querySelector("#al-filter-date-to").value,auth:t.querySelector("#al-filter-auth").value}}async function _e(t,e,a){async function s(r,l){let o=await It(r,l);t.querySelector("#al-table-body").innerHTML=(o.entries??[]).map(Ct).join("")||'<tr><td colspan="8" class="uk-text-center kp-text-dim">No records found</td></tr>';let d=Math.max(1,Math.ceil(o.total/nt)),u=t.querySelector("#al-pager");u&&(u.innerHTML=d>1?Pt(l,d):""),t.querySelector("#al-record-count").textContent=`${o.total} record${o.total!==1?"s":""}`,i(t,r,l,d),e=r,a=l}function i(r,l,o,d){r.querySelector("#al-prev")?.addEventListener("click",()=>s(l,o-1)),r.querySelector("#al-next")?.addEventListener("click",()=>s(l,o+1))}t.querySelector("#al-filter-apply")?.addEventListener("click",()=>{s(Te(t),1)}),t.querySelector("#al-filter-clear")?.addEventListener("click",()=>{["al-filter-user","al-filter-action","al-filter-target","al-filter-date-from","al-filter-date-to"].forEach(r=>{let l=t.querySelector(`#${r}`);l&&(l.value="")}),t.querySelector("#al-filter-auth").value="",s({username:"",action:"",target_type:"",date_from:"",date_to:"",auth:""},1)});let n=Math.max(1,Math.ceil(parseInt(t.querySelector("#al-record-count")?.textContent??"0")/nt));i(t,e,a,n),t.querySelector("#audit-log-panel")?.addEventListener("click",r=>{let l=r.target.closest(".al-diff-btn");if(!l)return;r.preventDefault(),r.stopPropagation();let o=l.dataset.prior??"",d=l.dataset.new??"",u="";o&&d?u=`=== BEFORE ===
`+st(o)+`

=== AFTER ===
`+st(d):d?u=st(d):u=st(o),document.body.insertAdjacentHTML("beforeend",`
            <div id="al-diff-modal-inst" uk-modal>
                <div class="uk-modal-dialog kp-modal uk-modal-body uk-width-large">
                    <button class="uk-modal-close-default" type="button" uk-close></button>
                    <h3 class="kp-view-title uk-margin-bottom">Request Detail</h3>
                    <pre class="kp-cron-output">${T(u)}</pre>
                </div>
            </div>`);let v=document.getElementById("al-diff-modal-inst");UIkit.modal(v).show(),v.addEventListener("hidden",()=>v.remove(),{once:!0})})}function st(t){try{return JSON.stringify(JSON.parse(t),null,2)}catch{return t}}async function qt(t){if(!q()){t.innerHTML=_("Access denied");return}let e={username:"",action:"",target_type:"",date_from:"",date_to:"",auth:""},a=await It(e,1);t.innerHTML=Le(a,e,1),_e(t,e,1)}function it(){document.body.insertAdjacentHTML("beforeend",`
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
                        <div class="uk-width-1-1 uk-hidden" id="cs-start-command-wrap">
                            <label class="kp-label">Start Command</label>
                            <input class="uk-input kp-input" name="start_command" type="text" placeholder="node server.js or dotnet MyApp.dll">
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
        </div>`);let e=UIkit.modal("#kp-create-site-modal"),a=document.getElementById("cs-site-type"),s=document.getElementById("cs-php-version-wrap"),i=document.getElementById("cs-node-version-wrap"),n=document.getElementById("cs-dotnet-version-wrap"),r=document.getElementById("cs-start-command-wrap"),l=document.getElementById("cs-wordpress-wrap");e.show();let o=document.getElementById("cs-domains-wrap"),d=document.getElementById("cs-rp-note");a.addEventListener("change",()=>{let u=parseInt(a.value);s.classList.toggle("uk-hidden",u!==1&&u!==2||u===6),i.classList.toggle("uk-hidden",u!==4),n.classList.toggle("uk-hidden",u!==5),r.classList.toggle("uk-hidden",u!==4&&u!==5),l.classList.toggle("uk-hidden",u!==1||u===6),o.classList.toggle("uk-hidden",u===6),d.classList.toggle("uk-hidden",u!==6)}),document.getElementById("create-site-form").addEventListener("submit",async u=>{u.preventDefault();let v=u.target.querySelector('[type="submit"]'),k=v.innerHTML;v.disabled=!0,v.innerHTML='<div uk-spinner="ratio: 0.6"></div> Creating...';let p=new FormData(u.target),b=parseInt(p.get("site_type")),g=null;b===4&&(g=parseInt(p.get("node_version"))),b===5&&(g=parseInt(p.get("dotnet_version")));let h={name:p.get("name").trim(),php_version:parseInt(p.get("php_version"))||3,site_type:b,runtime_version:g,start_command:p.get("start_command")?.trim()||"",domains:p.get("domains").split(`
`).map(x=>x.trim()).filter(Boolean),install_wordpress:b===1?p.get("install_wordpress")==="on":!1};e.hide(),document.getElementById("kp-create-site-modal")?.remove();let y=b===6?`Setting up '${h.name}' as a reverse proxy...`:`Setting up '${h.name}' \u2014 pulling images and provisioning containers...`;$("Creating Site",y);try{await m.post("/sites",h,6e5),w(),c.success(`Site '${h.name}' created`),f.go("sites")}catch(x){w(),c.error(x.message),v.disabled=!1,v.innerHTML=k}}),document.getElementById("kp-create-site-modal").addEventListener("hidden",()=>document.getElementById("kp-create-site-modal")?.remove())}var U=null;function Ce(t){return`${t.toFixed(1)}%`}var ot=null;function bt(){return ot||(ot=new Promise(t=>{if(window.Chart){t();return}let e=document.createElement("script");e.src="https://cdn.jsdelivr.net/npm/chart.js@latest/dist/chart.umd.min.js",e.onload=t,e.onerror=t,document.body.appendChild(e)}),ot)}function vt(t,e){return`
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

        </div>`}async function Pe(t){await bt();let e;try{e=await m.get(`/sites/${t}/stats/traffic`)}catch(n){document.getElementById("stats-ip-rows").innerHTML=`<tr><td colspan="2" class="kp-muted uk-text-small">Failed to load: ${n.message}</td></tr>`;return}document.getElementById("stats-2xx").textContent=(e.status_codes["2xx"]??0).toLocaleString(),document.getElementById("stats-3xx").textContent=(e.status_codes["3xx"]??0).toLocaleString(),document.getElementById("stats-4xx").textContent=(e.status_codes["4xx"]??0).toLocaleString(),document.getElementById("stats-5xx").textContent=(e.status_codes["5xx"]??0).toLocaleString(),document.getElementById("stats-bandwidth").textContent=E(e.total_bandwidth??0);let a=document.getElementById("stats-chart");if(a&&window.Chart){let n=(e.hits_per_hour??[]).map(l=>new Date(l.hour).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}));U&&(U.destroy(),U=null),U=new window.Chart(a,{type:"bar",data:{labels:n,datasets:[{label:"2xx",data:(e.hits_per_hour??[]).map(l=>l["2xx"]),backgroundColor:"rgba(39,174,96,0.75)",borderColor:"rgba(39,174,96,1)",borderWidth:1,borderRadius:3},{label:"3xx",data:(e.hits_per_hour??[]).map(l=>l["3xx"]),backgroundColor:"rgba(43,142,255,0.75)",borderColor:"rgba(43,142,255,1)",borderWidth:1,borderRadius:3},{label:"4xx",data:(e.hits_per_hour??[]).map(l=>l["4xx"]),backgroundColor:"rgba(255,171,0,0.75)",borderColor:"rgba(255,171,0,1)",borderWidth:1,borderRadius:3},{label:"5xx",data:(e.hits_per_hour??[]).map(l=>l["5xx"]),backgroundColor:"rgba(235,59,90,0.75)",borderColor:"rgba(235,59,90,1)",borderWidth:1,borderRadius:3}]},options:{responsive:!0,maintainAspectRatio:!1,onClick:(l,o)=>{if(!o||!o.length)return;let d=o[0].datasetIndex,u=U.data.datasets[d].label;if(u!=="4xx"&&u!=="5xx")return;let v=o[0].index,k=document.getElementById("stats-panel");if(!k||!k._hitsPerHour)return;let p=k._hitsPerHour[v]?.hour;p&&gt(`/sites/${t}/stats/drilldown`,p,u)},onHover:(l,o)=>{if(!o||!o.length){l.native.target.style.cursor="default";return}let d=U.data.datasets[o[0].datasetIndex].label;l.native.target.style.cursor=d==="4xx"||d==="5xx"?"pointer":"default"},plugins:{legend:{display:!0,labels:{color:"#6b8cae",font:{size:11}},onHover:l=>{l.native.target.style.cursor="pointer"},onLeave:l=>{l.native.target.style.cursor="default"}},tooltip:{mode:"index",backgroundColor:"#0c1530",borderColor:"#1a2a4a",borderWidth:1,titleColor:"#dde8f5",bodyColor:"#6b8cae"}},scales:{x:{stacked:!0,ticks:{color:"#6b8cae",font:{size:10},maxRotation:45},grid:{color:"rgba(26,42,74,0.6)"}},y:{stacked:!0,ticks:{color:"#6b8cae",font:{size:10}},grid:{color:"rgba(26,42,74,0.6)"},beginAtZero:!0}}}});let r=document.getElementById("stats-panel");r&&(r._hitsPerHour=e.hits_per_hour??[])}let s=document.getElementById("stats-ip-rows");s&&(s.innerHTML=(e.top_ips??[]).length===0?'<tr><td colspan="2" class="kp-muted uk-text-small">No data</td></tr>':(e.top_ips??[]).map(n=>`
                <tr>
                    <td class="kp-stats-table-cell-mono">${n.name}</td>
                    <td class="kp-stats-table-cell-count">${n.count.toLocaleString()}</td>
                </tr>`).join(""));let i=document.getElementById("stats-ua-rows");i&&(i.innerHTML=(e.top_uas??[]).length===0?'<tr><td colspan="2" class="kp-muted uk-text-small">No data</td></tr>':(e.top_uas??[]).map(n=>`
                <tr>
                    <td class="kp-stats-ua-cell" title="${n.name}">${n.name}</td>
                    <td class="kp-stats-table-cell-count">${n.count.toLocaleString()}</td>
                </tr>`).join(""))}async function Bt(t){let e=document.getElementById("stats-disk-wrap");if(e){e.innerHTML='<div uk-spinner="ratio:0.8" style="color:var(--kp-blue)"></div>';try{let a=await m.get(`/sites/${t}/stats/disk`);e.innerHTML=`
            <div class="uk-grid-small uk-child-width-1-2" uk-grid>
                <div>
                    <div class="kp-stat-card" style="padding:16px">
                        <div class="kp-stat-value kp-stats-disk-val">${E(a.html_bytes??0)}</div>
                        <div class="kp-stat-label">Site Files</div>
                    </div>
                </div>
                <div>
                    <div class="kp-stat-card" style="padding:16px">
                        <div class="kp-stat-value kp-stats-disk-val">${E(a.db_bytes??0)}</div>
                        <div class="kp-stat-label">Database</div>
                    </div>
                </div>
            </div>`}catch(a){e.innerHTML=`<p class="kp-muted uk-text-small">Failed to load disk usage: ${a.message}</p>`}}}function Ie(t){return!t||t.length===0?'<p class="kp-muted uk-text-small uk-margin-remove">No container data.</p>':`
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
                    ${Ce(a.cpu_percent)}
                </td>
                <td class="kp-stats-pod-mem">
                    ${E(a.mem_used)}
                    <span class="kp-stats-pod-mem-limit"> / ${E(a.mem_limit)}</span>
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
        </table>`}function qe(t,e,a,s,i){if(!t||t.length===0)return'<p class="kp-muted uk-text-small">No matching requests found.</p>';let n=[...t].sort((v,k)=>{let p,b;switch(a){case"time":p=v.time,b=k.time;break;case"method":p=v.method,b=k.method;break;case"site":p=v.site_name,b=k.site_name;break;case"ip":p=v.client_ip,b=k.client_ip;break;default:p=v.status,b=k.status;break}return p<b?s?1:-1:p>b?s?-1:1:0}),r=50,l=Math.ceil(n.length/r),d=n.slice(e*r,(e+1)*r).map(v=>{let k=v.ua,p=v.status>=500?"kp-badge-danger":"kp-badge-warning";return`
            <tr>
                <td class="kp-stats-table-cell-mono" style="white-space:nowrap">${v.time.slice(11,19)}</td>
                ${i?`<td class="kp-stats-table-cell-mono" style="font-size:0.8rem">${v.site_name}</td>`:""}
                <td class="kp-stats-table-cell-mono">${v.method}</td>
                <td style="word-break:break-all;font-size:0.8rem">${v.path}</td>
                <td><span class="kp-badge ${p}">${v.status}</span>${v.reason?` <span class="kp-badge kp-badge-danger" style="font-size:0.65rem" uk-tooltip="Blocked by security rule">${v.reason}</span>`:""}</td>
                <td class="kp-stats-table-cell-mono">${v.client_ip}</td>
                <td class="kp-dd-ua-cell">${k}</td>
            </tr>`}).join(""),u=l>1?`
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
                <tbody>${d}</tbody>
            </table>
        </div>
        ${u}`}async function gt(t,e,a,s=!1){let i=document.getElementById("stats-drilldown-modal"),n=document.getElementById("stats-drilldown-title"),r=document.getElementById("stats-drilldown-body");if(!i||!r)return;n.textContent=`${a} Requests \u2014 ${new Date(e).toLocaleString([],{hour:"2-digit",minute:"2-digit",month:"short",day:"numeric"})}`,r.innerHTML='<div uk-spinner="ratio:0.8" style="color:var(--kp-blue)"></div>',UIkit.modal(i).show();let l=[],o=0,d="time",u=!0;function v(){console.log(s),r.innerHTML=qe(l,o,d,u,s),r.querySelectorAll("th[data-dd-col]").forEach(k=>{k.addEventListener("click",()=>{let p=k.dataset.ddCol;d===p?u=!u:(d=p,u=!0),o=0,v()})}),r.querySelectorAll("[data-dd-page]").forEach(k=>{k.addEventListener("click",()=>{o=parseInt(k.dataset.ddPage,10),v()})})}try{l=await m.get(`${t}?hour=${encodeURIComponent(e)}&status=${a}`)}catch(k){r.innerHTML=`<p class="kp-muted uk-text-small">Failed to load: ${S(k.message)}</p>`;return}v()}function ht(t,e,a){let s=a===6,i=null;function n(){if(s)return;let o=t.querySelector("#stats-pod-indicator"),d=t.querySelector("#stats-pod-table-wrap");if(!d)return;let u=location.protocol==="https:"?"wss":"ws";i=new WebSocket(`${u}://${location.host}/api/sites/${e}/stats/pod`),i.onopen=()=>{o&&(o.className="kp-status kp-status-running",o.textContent="Live")},i.onmessage=v=>{try{let k=JSON.parse(v.data);d.innerHTML=Ie(k.containers??[]),d.querySelectorAll(".kp-stats-pod-role-btn").forEach(p=>{p.addEventListener("click",async()=>{let b=p.style.color;p.style.color="var(--kp-warning)";let g=p.dataset.container.split("-").pop();try{await m.post(`/sites/${e}/containers/${g}/restart`),c.success(`${g} restarted`)}catch(h){p.style.color=b,c.error(h.message)}})})}catch{}},i.onerror=()=>{o&&(o.className="kp-status kp-status-error",o.textContent="Error")},i.onclose=()=>{o&&o.textContent==="Live"&&(o.className="kp-status kp-status-stopped",o.textContent="Disconnected")}}function r(){i&&i.readyState===WebSocket.OPEN&&i.close(),i=null}t.querySelector("#stats-disk-refresh")?.addEventListener("click",()=>{Bt(e)}),n();let l=new MutationObserver(()=>{document.getElementById("stats-panel")||(r(),l.disconnect())});l.observe(document.getElementById("main")??document.body,{childList:!0,subtree:!1})}async function ft(t,e){let a=e===6;await Pe(t),a||await Bt(t)}async function Mt(t){let e=await m.get("/sites")??[];t.innerHTML=`
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

        ${e.length===0?tt("world","No sites yet \u2014 create one to get started"):`<div class="kp-table-wrap">
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
                                <th class="uk-visible@m kp-sortable" data-col="domain">Domain <span class="kp-sort-icon" data-col="domain"></span></th>
                                <th class="uk-table-shrink">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${e.map(a=>Be(a,e)).join("")}
                        </tbody>
                    </table>
                </div>
            </div>`}`,document.getElementById("sites-new-btn").addEventListener("click",()=>it()),Me()}function Be(t,e=[]){let a=t.Domains?.[0]??null,s=t.SiteType===6,i=t.ParentID>0?e.find(n=>n.ID===t.ParentID)??null:null;return`
        <tr data-site-id="${t.ID}" data-status="${s?"":t.SiteStatus}" data-type="${t.SiteType}">
            <!-- row checkbox -->
            <td class="uk-table-shrink">
                <input class="uk-checkbox kp-site-row-check" type="checkbox"
                       data-site-id="${t.ID}" data-site-type="${t.SiteType}">
            </td>
            <!-- status badge -->
            <td class="uk-table-shrink kp-site-row-status">${s?"":A(t.SiteStatus)}</td>

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
                ${O(t.SiteType)}${D(t)?" / "+D(t):""}
            </td>

            <!-- internal port -->
            <td class="uk-visible@m kp-muted kp-mono uk-text-small">:${t.Port}</td>

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
                    <button class="uk-button kp-btn-ghost kp-btn-sm"
                            data-action="clone" data-id="${t.ID}" data-name="${t.Name}"
                            uk-tooltip="Clone">
                        <span uk-icon="icon: move;"></span>
                    </button>
                    <button class="uk-button kp-btn-ghost kp-btn-sm"
                            data-action="edit" data-id="${t.ID}"
                            uk-tooltip="Edit">
                        <span uk-icon="icon: pencil;"></span>
                    </button>
                    <button class="uk-button kp-btn-ghost kp-btn-sm kp-btn-recreate"
                            data-action="delete" data-id="${t.ID}"
                            uk-tooltip="Delete">
                        <span uk-icon="icon: trash;"></span>
                    </button>
                </div>
            </td>
        </tr>`}function At(t,e=[]){let a=t.Domains?.[0]??null,s=t.SiteType===6,i=t.ParentID>0?e.find(n=>n.ID===t.ParentID)??null:null;return`
        <div class="kp-site-card uk-margin" data-site-id="${t.ID}" data-status="${s?"":t.SiteStatus}" data-type="${t.SiteType}">
            <div class="kp-site-card-header">
                <div>
                    <h2 class="kp-view-title" data-action="manage" data-id="${t.ID}">${t.Name}</h2>
                    <div class="kp-site-meta">
                        <span class="kp-site-meta-item"><span uk-icon="icon: server; ratio: 0.75"></span> :${t.Port}</span>
                        <span class="kp-site-meta-item"><span uk-icon="icon: code; ratio: 0.75"></span> ${O(t.SiteType)}${D(t)?" / "+D(t):""}</span>
                        ${a?`<span class="kp-site-meta-item" style="width:100%"><a href="http://${a}" target="_blank" style="color:var(--kp-cyan)">${a}</a></span>`:""}
                    </div>
                    ${i?`<div class="kp-site-meta kp-muted uk-text-small uk-margin-small-top"><span uk-icon="icon: git-fork; ratio: 0.75"></span> <a href="javascript:void(0)" data-action="manage" data-id="${i.ID}" style="color:var(--kp-cyan)">${i.Name}</a></div>`:""}
                </div>
                ${s?"":A(t.SiteStatus)}
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
                <button class="uk-button kp-btn-ghost kp-btn-sm" data-action="clone" data-id="${t.ID}" data-name="${t.Name}" uk-tooltip="Clone"><span uk-icon="icon: move;"></span></button>
                <button class="uk-button kp-btn-ghost kp-btn-sm" data-action="edit" data-id="${t.ID}" title="Edit" uk-tooltip="Edit the Site"><span uk-icon="icon: pencil;"></span></button>
                <button class="uk-button kp-btn-ghost kp-btn-sm" data-action="delete" data-id="${t.ID}" title="Delete" uk-tooltip="Delete the Site"><span uk-icon="icon: trash;"></span></button>
            </div>
        </div>`}function Me(){let t=document.getElementById("sites-bulk-bar"),e=document.getElementById("sites-bulk-count"),a=document.getElementById("sites-select-all"),s=document.getElementById("sites-search"),i=document.querySelector(".kp-table-wrap tbody");if(!t||!a)return;let n=null,r=!0,l=()=>[...document.querySelectorAll(".kp-site-row-check:checked")],o=()=>{let b=l().length;e.textContent=`${b} selected`,["bulk-start","bulk-stop","bulk-restart","bulk-flush","bulk-recreate"].forEach(y=>{let x=document.getElementById(y);x&&(x.disabled=b===0)});let g=document.getElementById("kp-bulk-mobile-btn");g&&(g.disabled=b===0);let h=document.querySelectorAll(".kp-site-row-check");a.indeterminate=b>0&&b<h.length,a.checked=h.length>0&&b===h.length},d=()=>{let p=s.value.trim().toLowerCase();document.querySelectorAll(".kp-table-wrap tbody tr").forEach(b=>{let g=b.querySelector(".kp-site-row-name")?.textContent.toLowerCase()??"",h=b.querySelector("td:nth-child(6)")?.textContent.toLowerCase()??"";b.style.display=!p||g.includes(p)||h.includes(p)?"":"none"})},u=p=>{n===p?r=!r:(n=p,r=!0),document.querySelectorAll(".kp-sort-icon").forEach(g=>{g.textContent=g.dataset.col===p?r?" \u2191":" \u2193":" \u2195"});let b=[...i.querySelectorAll("tr")];b.sort((g,h)=>{let y="",x="";return p==="name"?(y=g.querySelector(".kp-site-row-name")?.textContent??"",x=h.querySelector(".kp-site-row-name")?.textContent??""):p==="status"?(y=g.dataset.status??"",x=h.dataset.status??""):p==="type"?(y=g.dataset.type??"",x=h.dataset.type??""):p==="domain"&&(y=g.querySelector("td:nth-child(6)")?.textContent.trim()??"",x=h.querySelector("td:nth-child(6)")?.textContent.trim()??""),r?y.localeCompare(x):x.localeCompare(y)}),b.forEach(g=>i.appendChild(g))};a.addEventListener("change",()=>{document.querySelectorAll(".kp-site-row-check").forEach(p=>{p.checked=a.checked}),o()}),i?.addEventListener("change",p=>{p.target.classList.contains("kp-site-row-check")&&o()}),s?.addEventListener("input",d),document.querySelectorAll(".kp-sortable").forEach(p=>{p.addEventListener("click",()=>u(p.dataset.col))}),["bulk-start","bulk-stop","bulk-restart","bulk-flush","bulk-recreate"].forEach(p=>{let b=p.replace("bulk-","");document.getElementById(p)?.addEventListener("click",()=>{let g=l().filter(h=>h.dataset.siteType!=="6").map(h=>h.dataset.siteId);document.dispatchEvent(new CustomEvent("kp:bulk-action",{detail:{action:b,ids:g}}))})});let v=document.getElementById("kp-bulk-mobile-pill"),k=document.getElementById("kp-bulk-mobile-dropdown");document.getElementById("kp-bulk-mobile-btn")?.addEventListener("click",p=>{p.stopPropagation(),k.hidden=!k.hidden}),document.addEventListener("click",p=>{k&&!v?.contains(p.target)&&(k.hidden=!0)},{capture:!0}),["start","stop","restart","flush","recreate"].forEach(p=>{document.getElementById(`bulk-mobile-${p}`)?.addEventListener("click",b=>{b.preventDefault(),k.hidden=!0;let g=l().filter(h=>h.dataset.siteType!=="6").map(h=>h.dataset.siteId);document.dispatchEvent(new CustomEvent("kp:bulk-action",{detail:{action:p,ids:g}}))})}),document.querySelectorAll(".kp-sort-icon").forEach(p=>{p.textContent=" \u2195"}),o()}var N=null;async function Dt(t){let[e,a,s]=await Promise.all([m.get("/sites").catch(()=>[]),m.get("/stats/traffic").catch(()=>null),m.get("/stats/pod").catch(()=>null)]),i=e.filter(l=>l.SiteType!==6&&l.SiteStatus===1).length,n=e.filter(l=>l.SiteType===6).length,r=e.filter(l=>l.SiteType!==6&&l.SiteStatus===4).length;if(t.innerHTML=`

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
                            <div class="kp-stat-value" style="color:var(--kp-success)">${i}</div>
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
                            <div class="kp-stat-value" style="color:var(--kp-cyan)">${n}</div>
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
                            <div class="kp-stat-value" style="color:var(--kp-danger)">${r}</div>
                            <div class="kp-stat-label">Errors</div>
                        </div>
                        <span style="color:var(--kp-danger)" uk-icon="icon: warning; ratio: 1.75"></span>
                    </div>
                </div>
            </div>
        </div>

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
                    ${E(a?.total_bandwidth??0)}
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

                <!-- resource usage -->
                <div class="kp-view-header">
                    <h2 class="kp-view-title" style="font-size:1.25rem">Resource Usage</h2>
                </div>
                <div class="uk-grid-small uk-child-width-1-2" uk-grid>
                    <div><div class="kp-stat-card">
                        <div class="uk-flex uk-flex-between">
                            <div>
                                <div class="kp-stat-value">${(s?.total_cpu??0).toFixed(1)}%</div>
                                <div class="kp-stat-label">Total CPU</div>
                            </div>
                            <span class="kp-stat-icon" uk-icon="icon: bolt; ratio: 1.75"></span>
                        </div>
                    </div></div>
                    <div><div class="kp-stat-card">
                        <div class="uk-flex uk-flex-between">
                            <div>
                                <div class="kp-stat-value">${E(s?.mem_used??0)}</div>
                                <div class="kp-stat-label">Memory Used</div>
                            </div>
                            <span class="kp-stat-icon" uk-icon="icon: server; ratio: 1.75"></span>
                        </div>
                    </div></div>
                </div>

                <!-- recent sites -->
                <div class="kp-view-header uk-margin-top">
                    <h2 class="kp-view-title" style="font-size:1.25rem">Recent Sites</h2>
                </div>
                <div class="">
                    ${e.length===0?emptyState("world","No sites yet"):e.slice(-3).reverse().map(l=>At(l,e)).join("")}
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
                                        <td class="kp-mono" style="font-size:0.8rem">${l.name}</td>
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
        `,a?.hits_per_hour?.length){await bt();let l=document.getElementById("dash-traffic-chart");l&&window.Chart&&(N&&(N.destroy(),N=null),N=new window.Chart(l,{type:"bar",data:{labels:a.hits_per_hour.map(o=>new Date(o.hour).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})),datasets:[{label:"2xx",data:a.hits_per_hour.map(o=>o["2xx"]),backgroundColor:"rgba(39,174,96,0.75)",borderColor:"rgba(39,174,96,1)",borderWidth:1,borderRadius:3},{label:"3xx",data:a.hits_per_hour.map(o=>o["3xx"]),backgroundColor:"rgba(43,142,255,0.75)",borderColor:"rgba(43,142,255,1)",borderWidth:1,borderRadius:3},{label:"4xx",data:a.hits_per_hour.map(o=>o["4xx"]),backgroundColor:"rgba(255,171,0,0.75)",borderColor:"rgba(255,171,0,1)",borderWidth:1,borderRadius:3},{label:"5xx",data:a.hits_per_hour.map(o=>o["5xx"]),backgroundColor:"rgba(235,59,90,0.75)",borderColor:"rgba(235,59,90,1)",borderWidth:1,borderRadius:3}]},options:{responsive:!0,maintainAspectRatio:!1,onClick:(o,d)=>{if(!d||!d.length)return;let u=d[0].datasetIndex,v=N.data.datasets[u].label;if(v!=="4xx"&&v!=="5xx")return;let k=a.hits_per_hour[d[0].index]?.hour;k&&gt("/stats/drilldown",k,v,!0)},onHover:(o,d)=>{if(!d||!d.length){o.native.target.style.cursor="default";return}let u=N.data.datasets[d[0].datasetIndex].label;o.native.target.style.cursor=u==="4xx"||u==="5xx"?"pointer":"default"},plugins:{legend:{display:!0,labels:{color:"#6b8cae",font:{size:11}},onHover:o=>{o.native.target.style.cursor="pointer"},onLeave:o=>{o.native.target.style.cursor="default"}},tooltip:{mode:"index",backgroundColor:"#0c1530",borderColor:"#1a2a4a",borderWidth:1,titleColor:"#dde8f5",bodyColor:"#6b8cae"}},scales:{x:{stacked:!0,ticks:{color:"#6b8cae",font:{size:10},maxRotation:45},grid:{color:"rgba(26,42,74,0.6)"}},y:{stacked:!0,ticks:{color:"#6b8cae",font:{size:10}},grid:{color:"rgba(26,42,74,0.6)"},beginAtZero:!0}}}}))}document.getElementById("dash-new-site")?.addEventListener("click",()=>it())}function z(t=null){let e=t?`/sites/${t}/security/ip`:"/security/ip",a=t?`/sites/${t}/security/ua`:"/security/ua",s=t?`/sites/${t}/waf`:"/settings/waf",i=t?`/sites/${t}/security/country`:"/security/country",n=t?`/sites/${t}/security/asn`:"/security/asn";return`
        <div id="security-panel" data-ip-base="${e}" data-ua-base="${a}" data-geo-base="${i}" data-asn-base="${n}" data-waf-base="${s}" ${t?`data-site-id="${t}"`:""}>

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
                    Blacklist always wins \u2014 a blacklisted IP cannot be whitelisted.
                    Whitelist is disabled when empty.
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

        </div>`}async function B(t){let e=t.querySelector("#security-panel");if(!e)return;let a=e.dataset.ipBase,s=e.dataset.uaBase,i=e.dataset.wafBase;try{let n=e.dataset.geoBase,r=e.dataset.asnBase,l=[m.get(a),m.get(s),m.get(n),m.get(r)];e.dataset.siteId||l.push(m.get(i),m.get("/settings/trusted-proxies"),m.get("/security/bypass"));let[o,d,u,v,k,p,b]=await Promise.all(l);if(!t.querySelector("#sec-ip-whitelist"))return;if(t.querySelector("#sec-ip-whitelist").value=o.whitelist??"",t.querySelector("#sec-ip-blacklist").value=o.blacklist??"",t.querySelector("#sec-ua-whitelist").value=d.whitelist??"",t.querySelector("#sec-ua-blacklist").value=d.blacklist??"",t.querySelector("#sec-geo-whitelist").value=u.whitelist??"",t.querySelector("#sec-geo-blacklist").value=u.blacklist??"",t.querySelector("#sec-asn-whitelist").value=v.whitelist??"",t.querySelector("#sec-asn-blacklist").value=v.blacklist??"",k){let g=t.querySelector("#sec-waf-enabled"),h=t.querySelector("#sec-waf-audit"),y=t.querySelector("#sec-waf-mode"),x=t.querySelector("#sec-waf-paranoia"),R=t.querySelector("#sec-waf-exclusions");g&&(g.checked=!!k.Enabled),h&&(h.checked=!!k.AuditLog),y&&(y.value=String(k.Mode??0)),x&&(x.value=String(k.ParanoiaLevel??1)),R&&(R.value=k.Exclusions??"")}if(p){let g=t.querySelector("#sec-tp-cidrs");g&&(g.value=p.trusted_proxies_custom??"")}if(b){let g=t.querySelector("#sec-bypass-cidrs");g&&(g.value=b.bypass??"")}}catch(n){c.error("Failed to load security rules: "+n.message)}}function lt(t){let e=t.querySelector("#security-panel");if(!e)return;let a=e.dataset.ipBase,s=e.dataset.uaBase,i=e.dataset.geoBase;t.querySelector("#sec-ip-save")?.addEventListener("click",async()=>{let n=t.querySelector("#sec-ip-save"),r=n.innerHTML;n.disabled=!0,n.innerHTML='<div uk-spinner="ratio: 0.5"></div>';try{await m.put(a,{whitelist:t.querySelector("#sec-ip-whitelist").value,blacklist:t.querySelector("#sec-ip-blacklist").value}),c.success("IP rules saved")}catch(l){c.error(l.message)}finally{n.disabled=!1,n.innerHTML=r}}),t.querySelector("#sec-ua-save")?.addEventListener("click",async()=>{let n=t.querySelector("#sec-ua-save"),r=n.innerHTML;n.disabled=!0,n.innerHTML='<div uk-spinner="ratio: 0.5"></div>';try{await m.put(s,{whitelist:t.querySelector("#sec-ua-whitelist").value,blacklist:t.querySelector("#sec-ua-blacklist").value}),c.success("UA rules saved")}catch(l){c.error(l.message)}finally{n.disabled=!1,n.innerHTML=r}}),t.querySelector("#sec-geo-save")?.addEventListener("click",async()=>{let n=t.querySelector("#sec-geo-save"),r=n.innerHTML;n.disabled=!0,n.innerHTML='<div uk-spinner="ratio: 0.5"></div>';try{let l={whitelist:t.querySelector("#sec-geo-whitelist").value,blacklist:t.querySelector("#sec-geo-blacklist").value},o=await m.put(i,l);o?.status==="confirm"&&(await UIkit.modal.confirm(`${o.reason}. Save anyway?`),o=await m.put(i,{...l,confirm:!0})),c.success("Country rules saved")}catch(l){l instanceof Error&&c.error(l.message)}finally{n.disabled=!1,n.innerHTML=r}}),t.querySelector("#sec-asn-save")?.addEventListener("click",async()=>{let n=t.querySelector("#sec-asn-save"),r=n.innerHTML;n.disabled=!0,n.innerHTML='<div uk-spinner="ratio: 0.5"></div>';try{let l=t.querySelector("#security-panel").dataset.asnBase,o={whitelist:t.querySelector("#sec-asn-whitelist").value,blacklist:t.querySelector("#sec-asn-blacklist").value},d=await m.put(l,o);d?.status==="confirm"&&(await UIkit.modal.confirm(`${d.reason}. Save anyway?`),d=await m.put(l,{...o,confirm:!0})),c.success("ASN rules saved")}catch(l){l instanceof Error&&c.error(l.message)}finally{n.disabled=!1,n.innerHTML=r}}),t.querySelector("#sec-asn-lookup")?.addEventListener("click",()=>Ae(t)),t.querySelector("#sec-tp-save")?.addEventListener("click",async()=>{let n=t.querySelector("#sec-tp-save"),r=n.innerHTML;n.disabled=!0,n.innerHTML='<div uk-spinner="ratio: 0.5"></div>';try{await m.put("/settings/trusted-proxies",{trusted_proxies_custom:t.querySelector("#sec-tp-cidrs").value.trim()}),c.success("Trusted proxy ranges saved")}catch(l){c.error(l.message)}finally{n.disabled=!1,n.innerHTML=r}}),t.querySelector("#sec-bypass-save")?.addEventListener("click",async()=>{let n=t.querySelector("#sec-bypass-save"),r=n.innerHTML;n.disabled=!0,n.innerHTML='<div uk-spinner="ratio: 0.5"></div>';try{await m.put("/security/bypass",{bypass:t.querySelector("#sec-bypass-cidrs").value.trim()}),c.success("Bypass rules saved")}catch(l){c.error(l.message)}finally{n.disabled=!1,n.innerHTML=r}}),t.querySelector("#sec-tp-import")?.addEventListener("change",async n=>{let r=n.target.files[0];if(!r)return;let l=new FormData;l.append("file",r);try{let o=await fetch("/api/settings/trusted-proxies/import",{method:"POST",headers:{"X-CSRF-Token":window.KP?.csrf??""},body:l}),d=o.status===204?null:await o.json().catch(()=>null);if(!o.ok)throw new Error(d?.error||`HTTP ${o.status}`);await B(t),c.success("Trusted proxies imported")}catch(o){c.error(o.message)}finally{n.target.value=""}}),t.querySelector("#sec-waf-save")?.addEventListener("click",async()=>{let n=t.querySelector("#sec-waf-save"),r=n.innerHTML;n.disabled=!0,n.innerHTML='<div uk-spinner="ratio: 0.5"></div>';try{await m.put(e.dataset.wafBase,{enabled:t.querySelector("#sec-waf-enabled").checked,mode:parseInt(t.querySelector("#sec-waf-mode").value,10),paranoia_level:parseInt(t.querySelector("#sec-waf-paranoia").value,10),audit_log:t.querySelector("#sec-waf-audit").checked,exclusions:t.querySelector("#sec-waf-exclusions").value.trim()}),c.success("WAF settings saved \u2014 engine recompiling in background")}catch(l){c.error(l.message)}finally{n.disabled=!1,n.innerHTML=r}}),t.querySelector("#sec-ip-import")?.addEventListener("change",async n=>{let r=n.target.files[0];if(!r)return;let l=new FormData;l.append("file",r);try{let o=await fetch("/api"+a+"/import",{method:"POST",headers:{"X-CSRF-Token":window.KP?.csrf??""},body:l}),d=o.status===204?null:await o.json().catch(()=>null);if(!o.ok)throw new Error(d?.error||`HTTP ${o.status}`);await B(t),c.success("IP rules imported")}catch(o){c.error(o.message)}finally{n.target.value=""}}),t.querySelector("#sec-ua-import")?.addEventListener("change",async n=>{let r=n.target.files[0];if(!r)return;let l=new FormData;l.append("file",r);try{let o=await fetch("/api"+s+"/import",{method:"POST",headers:{"X-CSRF-Token":window.KP?.csrf??""},body:l}),d=o.status===204?null:await o.json().catch(()=>null);if(!o.ok)throw new Error(d?.error||`HTTP ${o.status}`);await B(t),c.success("UA rules imported")}catch(o){c.error(o.message)}finally{n.target.value=""}}),t.querySelector("#sec-waf-import")?.addEventListener("change",async n=>{let r=n.target.files[0];if(!r)return;let l=new FormData;l.append("file",r);try{let o=await fetch("/api/settings/waf/import",{method:"POST",headers:{"X-CSRF-Token":window.KP?.csrf??""},body:l}),d=o.status===204?null:await o.json().catch(()=>null);if(!o.ok)throw new Error(d?.error||`HTTP ${o.status}`);await B(t),c.success("WAF settings imported")}catch(o){c.error(o.message)}finally{n.target.value=""}})}function Ae(t){document.getElementById("kp-asn-lookup-modal")?.remove(),document.body.insertAdjacentHTML("beforeend",`
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
        </div>`);let a=UIkit.modal("#kp-asn-lookup-modal");a.show();let s=async()=>{let i=document.getElementById("asn-lookup-q").value.trim();if(!i)return;let n=document.getElementById("asn-lookup-result");n.innerHTML='<div uk-spinner="ratio: 0.5"></div>';try{let r=await m.get(`/security/asn/lookup?q=${encodeURIComponent(i)}`);if(!r?.asn){n.innerHTML='<p class="kp-muted uk-text-small">No ASN found for <span class="kp-mono"></span>.</p>',n.querySelector(".kp-mono").textContent=r?.ip||i;return}n.innerHTML=`
                <p class="uk-text-small">
                    <span class="kp-mono" id="asn-lookup-ip"></span> \u2192
                    <span class="kp-mono">AS${r.asn}</span>
                    <span id="asn-lookup-org"></span>
                    ${r.country?`<span class="kp-muted">(${r.country})</span>`:""}
                </p>
                <button class="uk-button kp-btn-ghost kp-btn-sm" id="asn-lookup-add">
                    <span uk-icon="ban"></span> Add AS${r.asn} to blacklist
                </button>`,n.querySelector("#asn-lookup-ip").textContent=r.ip,n.querySelector("#asn-lookup-org").textContent=r.org||"",n.querySelector("#asn-lookup-add").addEventListener("click",()=>{let l=t.querySelector("#sec-asn-blacklist"),o=`AS${r.asn}`;l.value.split(`
`).some(d=>d.trim().toUpperCase()===o)||(l.value=l.value.trim()?`${l.value.replace(/\s+$/,"")}
${o}`:o),a.hide(),c.success(`${o} added to blacklist \u2014 save to apply`)})}catch(r){n.innerHTML="",c.error(r.message)}};document.getElementById("asn-lookup-go").addEventListener("click",s),document.getElementById("asn-lookup-q").addEventListener("keydown",i=>{i.key==="Enter"&&s()})}async function Rt(t){if(!q()){t.innerHTML=_("Access denied");return}t.innerHTML=`
        <div class="kp-view-header">
            <h1 class="kp-view-title kp-cursor" style="font-size:2rem;">Global Security</h1>
        </div>
        <p class="kp-muted uk-text-small uk-margin-bottom">
            Global rules apply to all sites before per-site rules are evaluated.
            Blacklist always wins \u2014 a blacklisted entry cannot be overridden by any whitelist.
        </p>
        ${z(null)}`,lt(t),B(t)}function De(t){switch(t){case"valid":case"self-signed":return'<span class="kp-ssl-valid" uk-icon="icon: lock; ratio: 0.85" uk-tooltip="Valid SSL certificate"></span>';default:return'<span class="kp-ssl-none" uk-icon="icon: warning; ratio: 0.85" uk-tooltip="No SSL certificate"></span>'}}async function Ht(t){let e=document.getElementById("admin-domain-ssl");if(!(!e||!t))try{let a=await m.get(`/ssl-status?domain=${encodeURIComponent(t)}`);e.outerHTML=De(a.status)}catch{}}async function Ft(t){if(!q()){t.innerHTML=_("Access denied");return}let[e,a,s,i,n,r]=await Promise.all([m.get("/settings"),m.get("/settings/backup"),m.get("/settings/waf"),m.get("/settings/trusted-proxies"),m.get("/settings/notifications"),m.get("/settings/resources")]);t.innerHTML=`
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
                            value="${a.backup_schedule??""}">
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
                            value="${a.backup_retain_days??"30"}">
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
                            value="${a.s3_endpoint??""}">
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
                            value="${a.s3_bucket??""}">
                    </div>
                    <div class="uk-margin">
                        <label class="kp-label" for="s3-region">Region</label>
                        <input
                            class="uk-input kp-input kp-mono"
                            id="s3-region"
                            name="s3_region"
                            type="text"
                            placeholder="us-east-1"
                            value="${a.s3_region??""}">
                    </div>
                    <div class="uk-margin">
                        <label class="kp-label" for="s3-access-key">Access Key ID</label>
                        <input
                            class="uk-input kp-input kp-mono"
                            id="s3-access-key"
                            name="s3_access_key"
                            type="text"
                            placeholder="AKIAIOSFODNN7EXAMPLE"
                            value="${a.s3_access_key??""}">
                    </div>
                    <div class="uk-margin">
                        <label class="kp-label" for="s3-secret-key">Secret Access Key</label>
                        <input
                            class="uk-input kp-input kp-mono"
                            id="s3-secret-key"
                            name="s3_secret_key"
                            type="password"
                            placeholder="${a.s3_secret_key?"saved \u2014 enter new value to change":"enter secret key"}"
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
        <div class="uk-width-1-2@m">
            <!-- host resource reservation watcher -->
            <div class="kp-card uk-padding kp-settings-wrap uk-margin-top">
                <h3 class="kp-view-title uk-margin-bottom">Host Resource Watcher</h3>
                <form id="resource-form" class="uk-form-stacked">
                    <div class="uk-margin">
                        <label class="kp-label" for="resource-ram-reserve">RAM Reserve (GB)</label>
                        <input class="uk-input kp-input" id="resource-ram-reserve" name="resource_ram_reserve_gb" type="number"
                            min="0.5" max="64" step="0.5" placeholder="2"
                            value="${r.resource_ram_reserve_gb??"2"}">
                        <p class="kp-muted uk-text-small uk-margin-small-top">
                            Amount of RAM to keep free for the host OS. Throttling fires when aggregate pod usage exceeds total RAM minus this value.
                        </p>
                    </div>
                    <div class="uk-margin">
                        <label class="kp-label" for="resource-poll-interval">Poll Interval (seconds)</label>
                        <input class="uk-input kp-input" id="resource-poll-interval" name="resource_poll_interval" type="number"
                            min="5" max="300" step="5" placeholder="30"
                            value="${r.resource_poll_interval??"30"}">
                    </div>
                    <div class="uk-margin">
                        <label class="kp-label" for="resource-throttle-pct">Throttle Aggressiveness (%)</label>
                        <input class="uk-input kp-input" id="resource-throttle-pct" name="resource_throttle_pct" type="number"
                            min="10" max="90" step="5" placeholder="50"
                            value="${r.resource_throttle_pct??"50"}">
                        <p class="kp-muted uk-text-small uk-margin-small-top">
                            Percentage to reduce the offending pod's current memory usage by when throttling.
                        </p>
                    </div>
                    <div class="uk-margin">
                        <label class="kp-label" for="resource-webhook-url">Webhook URL <span class="kp-muted">(optional)</span></label>
                        <input class="uk-input kp-input kp-mono" id="resource-webhook-url" name="resource_webhook_url" type="url"
                            placeholder="https://hooks.example.com/notify"
                            value="${r.resource_webhook_url??""}">
                        <p class="kp-muted uk-text-small uk-margin-small-top">
                            HTTP POST with JSON payload on threshold breach and resolution. Compatible with Uptime Kuma, PagerDuty, Slack, etc.
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
    `,e.admin_domain&&Ht(e.admin_domain),document.getElementById("settings-form").addEventListener("submit",async l=>{l.preventDefault();let o=l.target.querySelector('[type="submit"]'),d=o.innerHTML;o.disabled=!0,o.innerHTML='<div uk-spinner="ratio: 0.6"></div> Saving...';let v={admin_domain:new FormData(l.target).get("admin_domain").trim()};try{await m.put("/settings",v),c.success("Settings saved"),Ht(v.admin_domain)}catch(k){c.error(k.message)}finally{o.disabled=!1,o.innerHTML=d}}),document.getElementById("settings-import").addEventListener("change",async l=>{let o=l.target.files[0];if(!o)return;let d=new FormData;d.append("file",o);try{let u=await fetch("/api/settings/import",{method:"POST",headers:{"X-CSRF-Token":window.KP?.csrf??""},body:d}),v=u.status===204?null:await u.json().catch(()=>null);if(!u.ok)throw new Error(v?.error||`HTTP ${u.status}`);c.success("Settings imported")}catch(u){c.error(u.message)}finally{l.target.value=""}}),document.getElementById("backup-form").addEventListener("submit",async l=>{l.preventDefault();let o=l.target.querySelector('[type="submit"]'),d=o.innerHTML;o.disabled=!0,o.innerHTML='<div uk-spinner="ratio: 0.6"></div> Saving...';let u=new FormData(l.target),v={backup_schedule:u.get("backup_schedule").trim(),backup_retain_days:u.get("backup_retain_days").trim()};try{await m.put("/settings/backup",v),c.success("Backup settings saved")}catch(k){c.error(k.message)}finally{o.disabled=!1,o.innerHTML=d}}),document.getElementById("s3-form").addEventListener("submit",async l=>{l.preventDefault();let o=l.target.querySelector('[type="submit"]'),d=o.innerHTML;o.disabled=!0,o.innerHTML='<div uk-spinner="ratio: 0.6"></div> Saving...';let u=new FormData(l.target),v={s3_endpoint:u.get("s3_endpoint").trim(),s3_bucket:u.get("s3_bucket").trim(),s3_region:u.get("s3_region").trim(),s3_access_key:u.get("s3_access_key").trim()},k=u.get("s3_secret_key").trim();k&&(v.s3_secret_key=k);try{await m.put("/settings/backup",v),c.success("S3 settings saved")}catch(p){c.error(p.message)}finally{o.disabled=!1,o.innerHTML=d}}),document.getElementById("smtp-form").addEventListener("submit",async l=>{l.preventDefault();let o=l.target.querySelector('[type="submit"]'),d=o.innerHTML;o.disabled=!0,o.innerHTML='<div uk-spinner="ratio: 0.6"></div> Saving...';let u=new FormData(l.target),v={smtp_host:u.get("smtp_host").trim(),smtp_port:u.get("smtp_port").trim(),smtp_username:u.get("smtp_username").trim(),smtp_from:u.get("smtp_from").trim(),smtp_tls:u.get("smtp_tls")?"true":"false"},k=u.get("smtp_password").trim();k&&(v.smtp_password=k);try{await m.put("/settings/notifications",v),c.success("Email notification settings saved")}catch(p){c.error(p.message)}finally{o.disabled=!1,o.innerHTML=d}}),document.getElementById("sns-form").addEventListener("submit",async l=>{l.preventDefault();let o=l.target.querySelector('[type="submit"]'),d=o.innerHTML;o.disabled=!0,o.innerHTML='<div uk-spinner="ratio: 0.6"></div> Saving...';let u=new FormData(l.target),v={aws_access_key:u.get("aws_access_key").trim(),aws_region:u.get("aws_region").trim(),aws_sns_sender_id:u.get("aws_sns_sender_id").trim()},k=u.get("aws_secret_key").trim();k&&(v.aws_secret_key=k);try{await m.put("/settings/notifications",v),c.success("SMS notification settings saved")}catch(p){c.error(p.message)}finally{o.disabled=!1,o.innerHTML=d}}),document.getElementById("resource-form").addEventListener("submit",async l=>{l.preventDefault();let o=l.target.querySelector('[type="submit"]'),d=o.innerHTML;o.disabled=!0,o.innerHTML='<div uk-spinner="ratio: 0.6"></div> Saving...';let u=new FormData(l.target),v={resource_ram_reserve_gb:u.get("resource_ram_reserve_gb").trim(),resource_poll_interval:u.get("resource_poll_interval").trim(),resource_throttle_pct:u.get("resource_throttle_pct").trim(),resource_webhook_url:u.get("resource_webhook_url").trim()};try{await m.put("/settings/resources",v),c.success("Resource watcher settings saved")}catch(k){c.error(k.message)}finally{o.disabled=!1,o.innerHTML=d}})}function Nt(t){return`
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

        </div>`}function Re(t){if(!t||t.length===0)return'<p class="kp-muted uk-text-small uk-margin-remove">No snapshots yet.</p>';let e=s=>s===2?'<span class="kp-mono" style="color:var(--kp-cyan)">S3</span>':'<span class="kp-mono" style="color:var(--kp-blue)">Local</span>';return`
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
            <td class="kp-mono" style="font-size:0.8rem">${s.SnapshotID}</td>
            <td>${s.Label||"\u2014"}</td>
            <td>${e(s.BackupType)}</td>
            <td>${E(s.SizeBytes)}</td>
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
        </div>`}function Ut(t,e){let a=Date.now()+18e5,s=setInterval(async()=>{try{let i=await m.get(`/sites/${e}/backups/restore-status`);(!i?.active||Date.now()>a)&&(clearInterval(s),w(),i?.active?c.error("Import timed out \u2014 check server logs"):c.success("Import complete"),await W(t,e))}catch{}},3e3)}async function W(t,e){try{let[a,s]=await Promise.all([m.get(`/sites/${e}/backup-repo`),m.get(`/sites/${e}/backups`)]),i=t.querySelector("#backup-local-enabled"),n=t.querySelector("#backup-s3-enabled");i&&(i.checked=!!a.LocalEnabled),n&&(n.checked=!!a.S3Enabled);let r=t.querySelector("#backup-error-banner");if(r)if(a.last_error){let o=a.last_error_at?` (${new Date(a.last_error_at).toLocaleString()})`:"";r.innerHTML=`
                    <div uk-alert class="uk-alert-warning">
                        <a class="uk-alert-close" uk-close></a>
                        <p><strong>Last scheduled backup failed${o}:</strong> ${a.last_error}</p>
                    </div>`}else r.innerHTML="";let l=t.querySelector("#backup-list-wrap");l&&(l.innerHTML=Re(s))}catch(a){let s=t.querySelector("#backup-list-wrap");s&&(s.innerHTML=`<p class="kp-muted uk-text-small">Failed to load backups: ${a.message}</p>`)}}function Wt(t,e){t.querySelector("#backup-repo-save")?.addEventListener("click",async()=>{let s={local_enabled:t.querySelector("#backup-local-enabled")?.checked??!1,s3_enabled:t.querySelector("#backup-s3-enabled")?.checked??!1};try{await m.put(`/sites/${e}/backup-repo`,s),c.success("Backup destinations saved")}catch(i){c.error(i.message)}}),t.querySelector("#backup-run-btn")?.addEventListener("click",async()=>{let s=0;try{s=(await m.get(`/sites/${e}/backups`))?.length??0}catch{}try{await m.post(`/sites/${e}/backups`,{label:"manual"})}catch(r){c.error(r.message);return}$("Backup Running","Snapshotting files and database \u2014 this may take a few minutes.");let i=Date.now()+1800*1e3,n=setInterval(async()=>{try{(((await m.get(`/sites/${e}/backups`))?.length??0)>s||Date.now()>i)&&(clearInterval(n),w(),await W(t,e),Date.now()<=i?c.success("Backup complete"):c.error("Backup is taking longer than expected \u2014 check server logs for status"))}catch{}},4e3)}),t.querySelector("#backup-list-wrap")?.addEventListener("click",async s=>{let i=s.target.closest(".backup-restore-btn");if(i){let l=i.dataset.id;if(!await L("Restore Site","This will restore the site from the selected snapshot. The site will show a maintenance page during the restore. Continue?"))return;try{await m.post(`/sites/${e}/backups/${l}/restore`)}catch(k){c.error(k.message);return}$("Restore Running","Restoring files and database \u2014 the site will return automatically when complete.");let d=Date.now(),u=Date.now()+900*1e3,v=setInterval(async()=>{try{let k=await m.get(`/sites/${e}/backups/restore-status`);(!k?.active||Date.now()>u)&&(clearInterval(v),w(),k?.active?c.error("Restore timed out"):c.success("Restore complete"),await W(t,e))}catch{}},3e3);return}let n=s.target.closest(".backup-delete-btn");if(n){let l=n.dataset.id;if(!await L("Delete Snapshot","This will permanently remove the snapshot from all configured repositories. This cannot be undone."))return;$("Deleting Snapshot","Removing snapshot data from repositories \u2014 this may take a moment.");try{await m.delete(`/sites/${e}/backups/${l}`),w(),c.success("Snapshot deleted"),await W(t,e)}catch(d){w(),c.error(d.message)}}let r=s.target.closest(".backup-download-btn");if(r){let l=r.dataset.id;$("Preparing Download","Your backup archive is being generated \u2014 this may take a moment depending on site size. Your download will begin automatically. Do not close this tab."),setTimeout(()=>{let o=document.createElement("a");o.href=`/api/sites/${e}/backups/${l}/download`,o.style.display="none",document.body.appendChild(o),o.click(),document.body.removeChild(o),setTimeout(()=>{w()},5e3)},300);return}});let a=t.querySelector("#import-backup-modal");a&&(UIkit.util.on(a,"beforeshow",async()=>{let s=a.querySelector("#import-target-site");try{let n=await m.get("/sites");s.innerHTML=n.map(r=>`<option value="${r.ID}"${r.ID===e?" selected":""}>${r.Name}</option>`).join("")}catch{s.innerHTML='<option value="">Failed to load sites</option>'}let i=a.querySelector("#import-sftp-list");try{let n=await m.get(`/sites/${e}/backups/import/files`);!n||n.length===0?i.innerHTML='<p class="kp-muted uk-text-small">No files found.</p>':i.innerHTML=n.map(r=>`
                    <div class="uk-flex uk-flex-middle uk-flex-between uk-margin-small-bottom">
                        <span class="kp-mono uk-text-small">${r}</span>
                        <button class="uk-button kp-btn-primary kp-btn-sm import-sftp-btn" data-file="${r}">
                            Restore
                        </button>
                    </div>`).join("")}catch(n){i.innerHTML=`<p class="kp-muted uk-text-small">Failed to list files: ${escapeHtml(n.message)}</p>`}}),a.querySelector("#import-upload-btn")?.addEventListener("click",async()=>{let s=a.querySelector("#import-file-input"),i=a.querySelector("#import-target-site")?.value;if(!s?.files?.length){c.error("Select an archive file first");return}let n=s.files[0],r=new FormData;r.append("archive",n),r.append("target_site_id",i),UIkit.modal(a).hide(),$("Importing Backup","Uploading and restoring \u2014 this may take several minutes.");try{await fetch(`/api/sites/${e}/backups/import/upload`,{method:"POST",headers:{"X-CSRF-Token":window.KP?.csrf??""},body:r,credentials:"same-origin"}).then(async l=>{if(!l.ok){let o=await l.json().catch(()=>({}));throw new Error(o.error||`HTTP ${l.status}`)}})}catch(l){w(),c.error(l.message);return}Ut(t,e)}),a.querySelector("#import-sftp-list")?.addEventListener("click",async s=>{let i=s.target.closest(".import-sftp-btn");if(!i)return;let n=i.dataset.file,r=a.querySelector("#import-target-site")?.value;UIkit.modal(a).hide(),$("Importing from SFTP","Restoring archive \u2014 this may take several minutes.");try{await m.post(`/sites/${e}/backups/import/sftp`,{filename:n,target_site_id:parseInt(r,10)})}catch(l){w(),c.error(l.message);return}Ut(t,e)}))}function yt(){return`
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
        </div>`}async function V(t){let e=document.getElementById("basicauth-panel");if(e)try{let[a,s]=await Promise.all([m.get(`/sites/${t}/basicauth`),m.get(`/sites/${t}/basicauth/users`)]),i=e.querySelector("#ba-enabled"),n=e.querySelector("#ba-realm");i&&(i.checked=!!a.Enabled),n&&(n.value=a.Realm??"Restricted"),He(e,s??[])}catch(a){c.error("Failed to load basic auth settings: "+a.message)}}function He(t,e){let a=t.querySelector("#ba-users-list");if(a){if(!e.length){a.innerHTML='<p class="kp-muted uk-text-small">No credentials configured.</p>';return}a.innerHTML=e.map(s=>`
        <div class="uk-flex uk-flex-middle uk-margin-small-bottom ba-user-row" data-uid="${s.id}" style="gap:8px">
            <span class="kp-mono" style="flex:1">${s.username}</span>
            <a href="javascript:void(0);" class="kp-muted ba-delete-btn" uk-icon="trash" uk-tooltip="Remove credential"></a>
        </div>`).join("")}}function wt(t,e){let a=new AbortController,s={signal:a.signal};t.addEventListener("click",async i=>{if(!i.target.closest("#ba-config-save"))return;let n=t.querySelector("#ba-config-save"),r=n.innerHTML;n.disabled=!0,n.innerHTML='<div uk-spinner="ratio: 0.5"></div>';try{await m.put(`/sites/${e}/basicauth`,{enabled:t.querySelector("#ba-enabled").checked,realm:t.querySelector("#ba-realm").value.trim()||"Restricted"}),c.success("Basic auth settings saved")}catch(l){c.error(l.message)}finally{n.disabled=!1,n.innerHTML=r}},s),t.addEventListener("click",async i=>{if(!i.target.closest("#ba-add-user"))return;let n=t.querySelector("#ba-new-username").value.trim(),r=t.querySelector("#ba-new-password").value;if(!n||!r){c.error("Username and password are required");return}let l=t.querySelector("#ba-add-user"),o=l.innerHTML;l.disabled=!0,l.innerHTML='<div uk-spinner="ratio: 0.5"></div>';try{await m.put(`/sites/${e}/basicauth/users`,{username:n,password:r}),c.success(`Credential saved for ${n}`),t.querySelector("#ba-new-username").value="",t.querySelector("#ba-new-password").value="",await V(e)}catch(d){c.error(d.message)}finally{l.disabled=!1,l.innerHTML=o}},s),t.addEventListener("click",async i=>{let n=i.target.closest(".ba-delete-btn");if(!n)return;let r=n.closest(".ba-user-row")?.dataset.uid;if(r)try{await m.delete(`/sites/${e}/basicauth/users/${r}`),c.success("Credential removed"),await V(e)}catch(l){c.error(l.message)}},s),t.__basicAuthAbort?.abort(),t.__basicAuthAbort=a}var K={1:"Nginx",2:"PHP",3:"MariaDB",4:"Redis",5:"Varnish"};function X(t,e,a){let s=a?Object.entries(a):[];return`
        <div>
            <div class="uk-flex uk-flex-between uk-flex-middle uk-margin-small-bottom">
                <div class="uk-flex uk-flex-middle" style="gap:10px">
                    <h4 class="kp-view-title uk-margin-remove">${K[e]}</h4>
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
                ${s.map(([i,n])=>J(i,n)).join("")}
            </div>
        </div>`}function jt(t,e){let a=e?.enabled==="true",s=e?Object.entries(e).filter(([i])=>i!=="enabled"):[];return`
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
                ${s.map(([i,n])=>J(i,n)).join("")}
            </div>
        </div>`}function J(t="",e=""){return`<div class="kp-config-row">
        <div class="kp-config-key">
            <input class="cfg-key" type="text" value="${t}" placeholder="key">
        </div>
        <div class="kp-config-val">
            <input class="cfg-val" type="text" value="${e}" placeholder="value">
        </div>
        <button class="kp-config-del cfg-del-row" title="Remove">
            <span uk-icon="icon: close; ratio: 0.8"></span>
        </button>
    </div>`}function Ot(t,e){t.addEventListener("click",a=>{if(a.target.closest(".cfg-add-row")){let s=a.target.closest(".cfg-add-row");t.querySelector(`.cfg-rows[data-type="${s.dataset.type}"]`).insertAdjacentHTML("beforeend",J())}}),t.addEventListener("click",a=>{a.target.closest(".cfg-del-row")&&a.target.closest(".kp-config-row").remove()}),t.addEventListener("click",async a=>{let s=a.target.closest(".cfg-save");if(!s)return;let{type:i,site:n}=s.dataset,r=t.querySelectorAll(`.cfg-rows[data-type="${i}"] .kp-config-row`),l={};if(r.forEach(o=>{let d=o.querySelector(".cfg-key").value.trim(),u=o.querySelector(".cfg-val").value.trim();d&&(l[d]=u)}),i==="5"){let o=t.querySelector(".varnish-enabled-toggle");l.enabled=o?.checked?"true":"false"}try{await m.put(`/sites/${n}/configs/${i}`,l),c.success(`${K[i]} config saved`)}catch(o){c.error(o.message)}}),t.addEventListener("click",async a=>{let s=a.target.closest(".cfg-reset");if(!s)return;let{type:i,site:n}=s.dataset;if(await L("Reset Config",`Reset ${K[i]} config to defaults?`))try{let l=await m.post(`/sites/${n}/configs/${i}/reset`),o=t.querySelector(`.cfg-rows[data-type="${i}"]`);o.innerHTML=Object.entries(l).map(([d,u])=>J(d,u)).join(""),c.success(`${K[i]} reset to defaults`)}catch(l){c.error(l.message)}}),t.addEventListener("change",async a=>{let s=a.target.closest(".cfg-import-input");if(!s)return;let{type:i,site:n}=s.dataset,r=s.files[0];if(!r)return;let l=new FormData;l.append("file",r);try{let o=await fetch(`/api/sites/${n}/configs/${i}/import`,{method:"POST",headers:{"X-CSRF-Token":window.KP?.csrf??""},body:l}),d=o.status===204?null:await o.json().catch(()=>null);if(!o.ok)throw new Error(d?.error||`HTTP ${o.status}`);let u=t.querySelector(`.cfg-rows[data-type="${i}"]`);u.innerHTML=Object.entries(d).map(([v,k])=>J(v,k)).join(""),c.success(`${K[i]} config imported`)}catch(o){c.error(o.message)}finally{s.value=""}})}function Vt(t){return`
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

        </div>`}function Kt(t){if(!t||t.length===0)return'<p class="kp-muted uk-text-small uk-margin-remove">No cron jobs configured.</p>';let e=s=>s?new Date(s).toLocaleString():"\u2014";return`
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
        </div>`}async function rt(t,e){let a=t.querySelector("#cron-list-wrap");if(a)try{let s=await m.get(`/sites/${e}/crons`);a.innerHTML=Kt(s)}catch(s){a.innerHTML=`<p class="kp-muted uk-text-small">Failed to load cron jobs: ${S(s.message)}</p>`}}function Jt(t,e){let a=[],s=t.querySelector("#cron-modal"),i=t.querySelector("#cron-modal-title"),n=t.querySelector("#cron-modal-id"),r=t.querySelector("#cron-modal-label"),l=t.querySelector("#cron-modal-command"),o=t.querySelector("#cron-modal-schedule"),d=t.querySelector("#cron-schedule-preview"),u=t.querySelector("#cron-modal-enabled");o?.addEventListener("input",()=>{d.textContent=zt(o.value.trim())}),t.querySelector("#cron-add-btn")?.addEventListener("click",()=>{i.textContent="Add Cron Job",n.value="",r.value="",l.value="",o.value="",d.textContent="",u.checked=!0,UIkit.modal(s).show()}),t.querySelector("#cron-modal-save")?.addEventListener("click",async()=>{let v=l.value.trim(),k=o.value.trim();if(!v||!k){c.error("Command and schedule are required");return}let p={label:r.value.trim(),command:v,schedule:k,enabled:u.checked},b=n.value;try{b?(await m.put(`/sites/${e}/crons/${b}`,p),c.success("Cron job updated")):(await m.post(`/sites/${e}/crons`,p),c.success("Cron job created")),UIkit.modal(s).hide(),await rt(t,e),a=await m.get(`/sites/${e}/crons`)}catch(g){c.error(g.message)}}),t.querySelector("#cron-list-wrap")?.addEventListener("click",async v=>{let k=v.target.closest(".cron-detail-btn");if(k){let h=k.dataset.id,y=a.find(R=>String(R.ID)===h);if(!y)return;document.body.insertAdjacentHTML("beforeend",`
                <div id="cron-detail-modal" uk-modal>
                    <div class="uk-modal-dialog kp-modal uk-modal-body uk-width-large">
                        <button class="uk-modal-close-default" type="button" uk-close></button>
                        <h3 class="kp-view-title uk-margin-bottom">Run Details \u2014 ${S(y.Label||String(y.ID))}</h3>
                        <div class="uk-margin-small-bottom">
                            <label class="kp-label">Output</label>
                            <pre class="kp-cron-output">${S(y.LastOutput||"(no output)")}</pre>
                        </div>
                        <div class="uk-margin-small-top">
                            <label class="kp-label">Error</label>
                            <pre class="kp-cron-output kp-cron-output-error">${S(y.LastError||"(no error)")}</pre>
                        </div>
                    </div>
                </div>`);let x=document.getElementById("cron-detail-modal");UIkit.modal(x).show(),x.addEventListener("hidden",()=>x.remove(),{once:!0});return}let p=v.target.closest(".cron-edit-btn");if(p){let h=p.dataset.id,y=a.find(x=>String(x.ID)===h);if(!y)return;i.textContent="Edit Cron Job",n.value=y.ID,r.value=y.Label||"",l.value=y.Command,o.value=y.Schedule,d.textContent=zt(y.Schedule),u.checked=y.Enabled,UIkit.modal(s).show();return}let b=v.target.closest(".cron-delete-btn");if(b){let h=b.dataset.id;if(!await L("Delete Cron Job","This will permanently remove the cron job. Continue?"))return;try{await m.delete(`/sites/${e}/crons/${h}`),c.success("Cron job deleted"),await rt(t,e),a=await m.get(`/sites/${e}/crons`)}catch(x){c.error(x.message)}return}let g=v.target.closest(".cron-run-btn");if(g){let h=g.dataset.id;try{await m.post(`/sites/${e}/crons/${h}/run`)}catch(I){c.error(I.message);return}$("Running Cron Job","Executing the job inside the container \u2014 please wait.");let y=null;try{y=(await m.get(`/sites/${e}/crons`)).find(H=>String(H.ID)===h)?.LastRun??null}catch{}let x=Date.now()+300*1e3,R=setInterval(async()=>{try{let I=await m.get(`/sites/${e}/crons`),H=I.find(Y=>String(Y.ID)===h);if(!H||H.LastRun!==y||Date.now()>x){clearInterval(R),w(),a=I??[];let Y=t.querySelector("#cron-list-wrap");Y&&(Y.innerHTML=Kt(I)),H?.LastError?c.error(`Job failed: ${H.LastError}`):c.success("Cron job complete")}}catch{}},2e3);return}}),t.querySelector("#cron-list-wrap")?.addEventListener("change",async v=>{let k=v.target.closest(".cron-toggle");if(!k)return;let p=k.dataset.id;try{await m.patch(`/sites/${e}/crons/${p}/toggle`,{enabled:k.checked}),c.success(k.checked?"Cron job enabled":"Cron job disabled")}catch(b){c.error(b.message),k.checked=!k.checked}}),m.get(`/sites/${e}/crons`).then(v=>{a=v??[]}).catch(()=>{})}function zt(t){if(!t)return"";let e=t.trim().split(/\s+/);if(e.length!==5)return"invalid expression";let[a,s,i,n,r]=e;if(t==="* * * * *")return"every minute";if(a!=="*"&&s!=="*"&&i==="*"&&n==="*"&&r==="*")return`daily at ${s.padStart(2,"0")}:${a.padStart(2,"0")}`;if(a!=="*"&&s!=="*"&&i==="*"&&n==="*"&&r!=="*"){let l=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];return`weekly on ${r.split(",").map(d=>l[parseInt(d)]??d).join(", ")} at ${s.padStart(2,"0")}:${a.padStart(2,"0")}`}return a.startsWith("*/")?`every ${a.slice(2)} minutes`:s.startsWith("*/")?`every ${s.slice(2)} hours`:t}var P="";function Zt(t){return`
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
        </div>`}function Fe(){let t=P?P.split("/"):[],e="",a=['<a href="#" data-path="">html</a>'];for(let s of t)e=e?e+"/"+s:s,a.push(`<span class="kp-fm-sep">/</span><a href="#" data-path="${S(e)}">${S(s)}</a>`);return a.join("")}function Ue(t){let e=new Date(t);return isNaN(e)?"":e.toLocaleString(void 0,{year:"numeric",month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})}function Xt(t){return t==="d"?"folder":t==="l"?"link":"file-text"}function j(t,e){return t?t+"/"+e:e}var Gt=new Set(["php","js","jsx","ts","tsx","css","scss","sass","less","html","htm","xml","json","txt","md","markdown","yml","yaml","ini","conf","cnf","toml","env","sh","bash","sql","log","csv","tsv","svg","htaccess","gitignore","lock","map"]);function Ne(t,e){if(e)return!1;let a=t.lastIndexOf(".");return t.startsWith(".")&&a===0?Gt.has(t.slice(1).toLowerCase()):a>=0&&Gt.has(t.slice(a+1).toLowerCase())}function We(t){if(!t||!t.length)return tt("folder","This folder is empty");let e=document.getElementById("fm-root").dataset.site;return`
        <table class="uk-table uk-table-divider uk-table-small uk-table-middle kp-fm-table">
            <thead>
                <tr>
                    <th>Name</th><th>Size</th><th>Perms</th><th>Modified</th><th></th>
                </tr>
            </thead>
            <tbody>${t.map(s=>{let i=j(P,s.name),n=s.is_dir,r=Ne(s.name,n),l=n?`<a href="#" class="fm-nav" data-path="${S(i)}"><span uk-icon="icon: ${Xt(s.type)}; ratio: 0.9"></span> ${S(s.name)}</a>`:`<span><span uk-icon="icon: ${Xt(s.type)}; ratio: 0.9"></span> ${S(s.name)}</span>`;return`
            <tr data-path="${S(i)}" data-name="${S(s.name)}" data-dir="${n?1:0}" data-mode="${S(s.mode)}">
                <td class="kp-fm-name">${l}</td>
                <td class="uk-text-nowrap">${E(s.size,n)}</td>
                <td><code class="kp-mono">${S(s.mode)}</code></td>
                <td class="uk-text-nowrap uk-text-small kp-muted">${Ue(s.mod_time)}</td>
                <td class="uk-text-right uk-text-nowrap">
                    ${r?`<button class="kp-fm-act fm-edit" data-path="${S(i)}" uk-tooltip="Edit"><span uk-icon="icon: pencil; ratio: 0.85"></span></button>`:""}
                    ${n?"":`<a class="kp-fm-act fm-download" href="/api/sites/${e}/files/download?path=${encodeURIComponent(i)}" uk-tooltip="Download"><span uk-icon="icon: download; ratio: 0.85"></span></a>`}
                    <button class="kp-fm-act fm-chmod" uk-tooltip="Permissions"><span uk-icon="icon: settings; ratio: 0.85"></span></button>
                    <button class="kp-fm-act fm-rename" uk-tooltip="Rename / Move"><span uk-icon="icon: move; ratio: 0.85"></span></button>
                    <button class="kp-fm-act fm-copy" uk-tooltip="Copy"><span uk-icon="icon: copy; ratio: 0.85"></span></button>
                    <button class="kp-fm-act fm-delete" uk-tooltip="Delete"><span uk-icon="icon: trash; ratio: 0.85"></span></button>
                </td>
            </tr>`}).join("")}</tbody>
        </table>`}async function C(t){let e=document.getElementById("fm-list"),a=document.getElementById("fm-breadcrumb");if(e){e.innerHTML=Z(),a&&(a.innerHTML=Fe());try{let s=await m.get(`/sites/${t}/files?path=${encodeURIComponent(P)}`);e.innerHTML=We(s)}catch(s){e.innerHTML=_("Failed to list files: "+s.message)}}}function Qt(t,e){P=e||"",C(t)}function G(t,e,a=""){return new Promise(s=>{let i="fm-prompt-modal";document.getElementById(i)?.remove();let n=document.createElement("div");n.id=i,n.setAttribute("uk-modal",""),n.innerHTML=`
            <div class="uk-modal-dialog uk-modal-body kp-modal">
                <h3 class="uk-modal-title">${S(t)}</h3>
                <label class="kp-label uk-margin-small-bottom">${S(e)}</label>
                <input class="uk-input kp-input" id="fm-prompt-input" value="${S(a)}" autocomplete="off">
                <div class="uk-flex uk-flex-right uk-margin-top" style="gap:8px">
                    <button class="uk-button kp-btn-ghost uk-modal-close">Cancel</button>
                    <button class="uk-button kp-btn-primary" id="fm-prompt-ok">OK</button>
                </div>
            </div>`,document.body.appendChild(n),window.UIkit&&UIkit.icon(n);let r=UIkit.modal(n),l=n.querySelector("#fm-prompt-input"),o=!1,d=u=>{o||(o=!0,s(u),r.hide())};n.querySelector("#fm-prompt-ok").addEventListener("click",()=>d(l.value.trim()||null)),l.addEventListener("keydown",u=>{u.key==="Enter"&&(u.preventDefault(),d(l.value.trim()||null))}),UIkit.util.on(n,"hidden",()=>{o||(o=!0,s(null)),n.remove()}),r.show(),setTimeout(()=>l.focus(),50)})}async function je(t,e){let a=j(P,e.name),s=await fetch(`/api/sites/${t}/files/upload?path=${encodeURIComponent(a)}`,{method:"POST",headers:{"X-CSRF-Token":window.KP?.csrf??""},body:e}),i=s.status===204?null:await s.json().catch(()=>null);if(!s.ok)throw new Error(i?.error||`HTTP ${s.status}`)}function te(t,e){P="",t.addEventListener("click",a=>{let s=a.target.closest("#fm-breadcrumb a");if(s){a.preventDefault(),Qt(e,s.dataset.path);return}let i=a.target.closest(".fm-nav");if(i){a.preventDefault(),Qt(e,i.dataset.path);return}let n=a.target.closest(".fm-edit");if(n){a.preventDefault(),Ve(e,n.dataset.path,n.dataset.path.split("/").pop());return}}),t.querySelector("#fm-new-file")?.addEventListener("click",async()=>{let a=await G("New File","File name");if(a)try{await m.post(`/sites/${e}/files/file`,{path:j(P,a)}),C(e)}catch(s){c.error(s.message)}}),t.querySelector("#fm-new-dir")?.addEventListener("click",async()=>{let a=await G("New Folder","Folder name");if(a)try{await m.post(`/sites/${e}/files/dir`,{path:j(P,a)}),C(e)}catch(s){c.error(s.message)}}),t.querySelector("#fm-upload")?.addEventListener("change",async a=>{let s=[...a.target.files];if(s.length)try{for(let i of s)await je(e,i);c.success(s.length===1?"File uploaded":`${s.length} files uploaded`),C(e)}catch(i){c.error(i.message)}finally{a.target.value=""}}),t.querySelector("#fm-refresh")?.addEventListener("click",()=>C(e)),t.addEventListener("click",async a=>{let s=a.target.closest("tr[data-path]");if(!s)return;let i=s.dataset.path,n=s.dataset.name;if(a.target.closest(".fm-chmod")){let r=await G("Permissions",`Octal mode for "${n}"`,s.dataset.mode);if(!r)return;try{await m.patch(`/sites/${e}/files/chmod`,{path:i,mode:r}),C(e)}catch(l){c.error(l.message)}return}if(a.target.closest(".fm-rename")){let r=await G("Rename / Move","New path (relative to current folder)",n);if(!r||r===n)return;try{await m.post(`/sites/${e}/files/move`,{src:i,dst:j(P,r)}),C(e)}catch(l){c.error(l.message)}return}if(a.target.closest(".fm-copy")){let r=await G("Copy","Destination name",n+"-copy");if(!r)return;try{await m.post(`/sites/${e}/files/copy`,{src:i,dst:j(P,r)}),C(e)}catch(l){c.error(l.message)}return}if(a.target.closest(".fm-delete")){if(!await L("Delete",`Delete "${n}"? This cannot be undone.`))return;try{await m.delete(`/sites/${e}/files?path=${encodeURIComponent(i)}`),C(e)}catch(l){c.error(l.message)}return}})}var ct=null;function Yt(t){if(document.querySelector(`link[href="${t}"]`))return;let e=document.createElement("link");e.rel="stylesheet",e.href=t,document.head.appendChild(e)}function xt(t){return new Promise((e,a)=>{let s=document.querySelector(`script[src="${t}"]`);if(s){if(s.dataset.loaded)return e();s.addEventListener("load",()=>e()),s.addEventListener("error",()=>a(new Error("failed to load "+t)));return}let i=document.createElement("script");i.src=t,i.addEventListener("load",()=>{i.dataset.loaded="1",e()}),i.addEventListener("error",()=>a(new Error("failed to load "+t))),document.head.appendChild(i)})}function Oe(){if(ct)return ct;let t="https://cdn.jsdelivr.net/npm/codemirror@5";return Yt(`${t}/lib/codemirror.css`),Yt(`${t}/theme/material-darker.css`),ct=xt(`${t}/lib/codemirror.js`).then(()=>Promise.all([xt(`${t}/mode/meta.js`),xt(`${t}/addon/mode/loadmode.js`)])).then(()=>{window.CodeMirror.modeURL=`${t}/mode/%N/%N.js`}),ct}function ze(t){let e=window.CodeMirror.findModeByFileName(t);return e?e.mode:null}async function Ve(t,e,a){let s;try{s=await m.get(`/sites/${t}/files/content?path=${encodeURIComponent(e)}`)}catch(k){let p=/too large/i.test(k.message)?"File is too large to edit \u2014 download it instead.":/binary/i.test(k.message)?"Binary file \u2014 download it instead of editing.":k.message;c.error(p);return}try{await Oe()}catch(k){c.error("Editor failed to load: "+k.message);return}let i="fm-editor-modal";document.getElementById(i)?.remove();let n=document.createElement("div");n.id=i,n.setAttribute("uk-modal",""),n.innerHTML=`
        <div class="uk-modal-dialog kp-modal kp-fm-editor-dialog">
            <div class="uk-flex uk-flex-middle uk-flex-between uk-padding-small">
                <h3 class="uk-modal-title uk-margin-remove"><span uk-icon="file-text"></span> ${S(a)} <span id="fm-ed-dirty" class="kp-muted uk-text-small" hidden>\u2022 unsaved</span></h3>
                <div class="uk-flex" style="gap:8px">
                    <button class="uk-button kp-btn-primary kp-btn-sm" id="fm-ed-save"><span uk-icon="icon: check; ratio: 0.85"></span> Save</button>
                    <button class="uk-button kp-btn-ghost kp-btn-sm uk-modal-close"><span uk-icon="icon: close; ratio: 0.85"></span></button>
                </div>
            </div>
            <div class="kp-fm-editor-body">
                <textarea id="fm-ed-area"></textarea>
            </div>
        </div>`,document.body.appendChild(n),window.UIkit&&UIkit.icon(n);let r=UIkit.modal(n,{bgClose:!1,escClose:!0}),l=n.querySelector("#fm-ed-dirty"),o=null,d=!0,u=k=>{d=!k,l.hidden=!k};UIkit.util.on(n,"shown",()=>{if(o)return;o=window.CodeMirror.fromTextArea(n.querySelector("#fm-ed-area"),{value:s.content,lineNumbers:!0,theme:"material-darker",indentUnit:4,lineWrapping:!1,extraKeys:{"Ctrl-S":v,"Cmd-S":v,"Ctrl-F":"findPersistent","Ctrl-/":"toggleComment"}}),o.setValue(s.content),o.on("change",()=>u(!0));let k=ze(a);k&&(o.setOption("mode",k),window.CodeMirror.autoLoadMode(o,k)),setTimeout(()=>o.refresh(),30)}),UIkit.util.on(n,"hidden",()=>n.remove());async function v(){if(!o)return;let k=n.querySelector("#fm-ed-save"),p=k.innerHTML;k.disabled=!0,k.innerHTML='<div uk-spinner="ratio: 0.6"></div>';try{await m.put(`/sites/${t}/files/content`,{path:e,content:o.getValue()}),u(!1),c.success("Saved"),C(t)}catch(b){c.error(b.message)}finally{k.disabled=!1,k.innerHTML=p}}n.querySelector("#fm-ed-save").addEventListener("click",v),UIkit.util.on(n,"beforehide",k=>{!d&&!window.confirm("Discard unsaved changes?")&&k.preventDefault()}),r.show()}var Ke=2e3;function St(t,e){return`
        <div>
            <div class="kp-log-controls">
                <select class="uk-select kp-select" id="log-container" style="width:140px;height:38px">
                    ${e===6?'<option value="access">Access Log</option><option value="waf">WAF Log</option>':`<option value="access">Access</option>
            <option value="nginx">Nginx</option>
                    ${(()=>{switch(e){case 1:case 2:return'<option value="php">PHP-FPM</option>';case 4:return'<option value="app">Node.js</option>';case 5:return'<option value="app">.NET</option>';default:return""}})()}
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
        </div>`}function ee(t,e){let a=null,s=!1,i=t.querySelector("#log-output"),n=t.querySelector("#log-connect"),r=t.querySelector("#log-disconnect"),l=t.querySelector("#log-clear"),o=t.querySelector("#log-autoscroll"),d=t.querySelector("#log-status");function u(p){for(p.split(`
`).forEach(b=>{if(!b)return;let g=document.createElement("div");g.className=b.match(/WAF BLOCK/i)?"kp-log-line-err":b.match(/WAF DETECT/i)?"kp-log-line-warn":b.match(/error|crit|emerg/i)?"kp-log-line-err":b.match(/warn/i)?"kp-log-line-warn":b.match(/info|notice/i)?"kp-log-line-info":"",g.textContent=b,i.appendChild(g)});i.childElementCount>Ke;)i.removeChild(i.firstChild);o.checked&&(i.scrollTop=i.scrollHeight)}function v(){a&&(a.close(),a=null),s=!1,n.disabled=!1,r.disabled=!0,d&&(d.textContent="Disconnected")}n.addEventListener("click",()=>{v();let p=t.querySelector("#log-container").value,b=t.querySelector("#log-tail").value,g=location.protocol==="https:"?"wss":"ws",h=p==="waf"?`${g}://${location.host}/api/sites/${e}/logs/waf?tail=${b}`:p==="proxy"?`${g}://${location.host}/api/sites/${e}/logs/proxy?tail=${b}`:p==="access"?`${g}://${location.host}/api/sites/${e}/logs/proxy?tail=${b}`:`${g}://${location.host}/api/sites/${e}/logs?container=${p}&tail=${b}`;a=new WebSocket(h),a.onopen=()=>{s=!0,n.disabled=!0,r.disabled=!1,d&&(d.textContent=`Connected \u2014 ${p}`)},a.onmessage=y=>u(y.data),a.onerror=()=>{},a.onclose=()=>{s=!1,n.disabled=!1,r.disabled=!0,d&&(d.textContent="Disconnected")}}),r.addEventListener("click",v),l.addEventListener("click",()=>{i.innerHTML=""}),t.querySelector("#log-container").addEventListener("change",()=>{a&&a.readyState===WebSocket.OPEN&&(v(),n.click())});let k=f.go.bind(f);f.go=function(p,b={}){return a&&v(),k(p,b)}}function Je(t){switch(t){case"valid":return'<span class="kp-ssl-valid" uk-icon="icon: lock; ratio: 0.85" uk-tooltip="Valid SSL certificate"></span>';case"self-signed":return'<span class="kp-ssl-self-signed" uk-icon="icon: lock; ratio: 0.85" uk-tooltip="Self-signed certificate"></span>';default:return'<span class="kp-ssl-none" uk-icon="icon: warning; ratio: 0.85" uk-tooltip="No SSL certificate"></span>'}}async function ae(t,e){try{let a=await m.get(`/ssl-status?domain=${encodeURIComponent(t)}`),s=document.getElementById(`ssl-icon-${e}`);s&&(s.outerHTML=Je(a.status))}catch{}}function se(t){t.forEach(e=>ae(e.Domain,e.ID))}function ne(t,e,a,s=0,i=null){let n=t.SiteType!==3&&t.PMAPort>0;return`
        <div class="uk-grid-medium" uk-grid>
            <div class="uk-width-1-2@m">
                <div class="kp-card uk-padding-small">
                    <h3 class="kp-view-title uk-margin-bottom">Site Info</h3>
                    <table class="uk-table uk-table-small uk-table-divider uk-margin-remove">
                        <tbody>
                            <tr><td class="kp-muted">Name</td><td>${t.Name}</td></tr>
                            ${i?`<tr><td class="kp-muted">Parent</td><td><a href="javascript:void(0)" data-action="manage" data-id="${s}" style="color:var(--kp-cyan)">${i}</a></td></tr>`:""}
                            <tr><td class="kp-muted">Internal Port</td><td>:${t.Port}</td></tr>
                            <tr><td class="kp-muted">Type</td><td>${O(t.SiteType)}</td></tr>
                            <tr><td class="kp-muted">Version</td><td>${D(t)}</td></tr>
                            <tr><td class="kp-muted">Status</td><td>${A(t.SiteStatus)}</td></tr>
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
                        ${e.length?e.map(ie).join(""):'<p class="kp-muted uk-text-small">No domains configured</p>'}
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
                                    <span id="sftp-pass-display" class="kp-mono kp-sftp-pass">${a?.Password??"\u2014"}</span>
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
        </div>`}function ie(t){return`<div class="uk-flex uk-flex-between uk-flex-middle kp-config-row" data-domain-id="${t.ID}">
        <div class="uk-flex uk-flex-middle kp-domain-row-inner">
            <span id="ssl-icon-${t.ID}" class="kp-ssl-pending" uk-icon="icon: more; ratio: 0.85"></span>
            <span class="uk-text-small kp-mono">${t.Domain}</span>
        </div>
        <button class="kp-config-del" data-action="delete-domain" data-did="${t.ID}" title="Remove">
            <span uk-icon="icon: close; ratio: 0.8"></span>
        </button>
    </div>`}function oe(t,e){t.querySelector("#domain-add-btn")?.addEventListener("click",()=>{t.querySelector("#domain-add-form").classList.remove("uk-hidden")}),t.querySelector("#domain-cancel-btn")?.addEventListener("click",()=>{t.querySelector("#domain-add-form").classList.add("uk-hidden")}),t.querySelector("#domain-save-btn")?.addEventListener("click",async()=>{let a=t.querySelector("#domain-add-input").value.trim();if(a)try{let s=await m.post(`/sites/${e}/domains`,{domain:a});t.querySelector("#domain-list").insertAdjacentHTML("beforeend",ie(s)),ae(s.Domain,s.ID),t.querySelector("#domain-add-form").classList.add("uk-hidden"),t.querySelector("#domain-add-input").value="",c.success("Domain added")}catch(s){c.error(s.message)}}),t.querySelector("#domain-list")?.addEventListener("click",async a=>{let s=a.target.closest('[data-action="delete-domain"]');if(!(!s||!await L("Remove Domain","Remove this domain from the site?")))try{await m.delete(`/sites/${e}/domains/${s.dataset.did}`),s.closest("[data-domain-id]").remove(),c.success("Domain removed")}catch(n){c.error(n.message)}})}function le(t,e,a=null){t.querySelector("#sftp-regen-btn")?.addEventListener("click",async()=>{let s=t.querySelector("#sftp-regen-btn"),i=s.innerHTML;s.disabled=!0,s.innerHTML='<div uk-spinner="ratio: 0.5"></div>';try{await m.post(`/sites/${e}/sftp-regen`),c.success("SFTP password regenerated"),f.go("site-detail",{id:String(e)})}catch(n){c.error(n.message),s.disabled=!1,s.innerHTML=i}}),t.querySelector("#sftp-copy-btn")?.addEventListener("click",()=>{let s=t.querySelector("#sftp-pass-display")?.textContent;if(s)if(navigator.clipboard)navigator.clipboard.writeText(s).then(()=>c.success("Password copied to clipboard")).catch(()=>c.error("Failed to copy password"));else{let i=document.createElement("textarea");i.value=s,i.style.cssText="position:fixed;opacity:0",document.body.appendChild(i),i.select(),document.execCommand("copy"),document.body.removeChild(i),c.success("Password copied to clipboard")}}),t.querySelector("#pma-open-btn")?.addEventListener("click",async()=>{let s=t.querySelector("#pma-open-btn"),i=s.innerHTML;s.disabled=!0,s.innerHTML='<div uk-spinner="ratio: 0.5"></div> Opening...';try{let n=await m.post(`/sites/${e}/pma-token`);window.open(n.url,"_blank")}catch(n){c.error(n.message)}finally{s.disabled=!1,s.innerHTML=i}}),t.querySelector("#sync-pull-btn")?.addEventListener("click",async()=>{if(await mt("pull",a.Name,t.querySelector('[data-action="manage"][data-id="'+a.ParentID+'"]')?.textContent?.trim()??"parent"))try{c.success("Pull from parent complete")}catch(i){c.error(i.message)}}),t.querySelector("#sync-push-btn")?.addEventListener("click",async()=>{if(await mt("push",a.Name,t.querySelector('[data-action="manage"][data-id="'+a.ParentID+'"]')?.textContent?.trim()??"parent"))try{c.success("Push to parent complete")}catch(i){c.error(i.message)}})}function re(){return`
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
        </div>`}function ce(t="",e="",a=301){return`
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
        </div>`}async function de(t){let e=document.getElementById("redirects-list");if(!e)return;e.innerHTML="";let a=await m.get(`/sites/${t}/redirects`);e.innerHTML=a.map(s=>ce(s.Source,s.Target,s.Code)).join("")}function ue(t,e){let a=new AbortController,s={signal:a.signal};t.addEventListener("click",i=>{i.target.closest("#redirect-add-btn")&&document.getElementById("redirects-list").insertAdjacentHTML("beforeend",ce()),i.target.closest(".redirect-remove-btn")&&i.target.closest(".redirect-row").remove()},s),t.addEventListener("click",async i=>{if(!i.target.closest("#redirect-save-btn"))return;let n=[...document.querySelectorAll(".redirect-row")].map(r=>({Source:r.querySelector(".redirect-source").value.trim(),Target:r.querySelector(".redirect-target").value.trim(),Code:parseInt(r.querySelector(".redirect-code").value,10)}));try{await m.put(`/sites/${e}/redirects`,n),c.success("Redirects saved")}catch(r){c.error(r.message||"Failed to save redirects")}},s),t.__redirectsAbort?.abort(),t.__redirectsAbort=a}function Xe(){return`
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
        </div>`}async function $t(t){let e=document.getElementById("waf-tab-panel");if(!e)return;e.innerHTML=Xe();let a=document.getElementById("waf-export-btn");a&&(a.href=`/api/sites/${t}/waf/export`);try{let s=await m.get(`/sites/${t}/waf`),i=document.getElementById("waf-override"),n=document.getElementById("waf-site-exclusions");i&&(i.value=String(s.Override??0)),n&&(n.value=s.Exclusions??"");let r=document.getElementById("waf-plugins-list");if(r){let[l,o]=await Promise.all([m.get("/settings/waf/plugins"),m.get(`/sites/${t}/waf/plugins`)]),d=new Set(o??[]);!l||l.length===0?r.innerHTML='<span class="kp-muted uk-text-small">No plugins found in local CRS install.</span>':window.matchMedia("(max-width: 959px)").matches?r.innerHTML=`
                    <select multiple class="uk-select kp-select waf-plugin-select" size="${Math.min(l.length,8)}">
                        ${l.map(u=>`
                        <option value="${u}" ${d.has(u)?"selected":""}>${u}</option>
                        `).join("")}
                    </select>`:(r.innerHTML=`
                    <div class="waf-plugin-pills">
                        ${l.map(u=>`
                        <span class="waf-plugin-pill ${d.has(u)?"active":""}"
                            data-plugin="${u}">${u}</span>
                        `).join("")}
                    </div>`,r.querySelectorAll(".waf-plugin-pill").forEach(u=>{u.addEventListener("click",()=>u.classList.toggle("active"))}))}}catch(s){c.error("Failed to load WAF settings: "+s.message)}}function pe(t,e,a){t.addEventListener("submit",async s=>{if(s.target.id!=="waf-override-form")return;s.preventDefault();let i=s.target.querySelector('[type="submit"]'),n=i.innerHTML;i.disabled=!0,i.innerHTML='<div uk-spinner="ratio: 0.6"></div> Saving...';let r=new FormData(s.target),l={override:parseInt(r.get("override"),10),exclusions:r.get("exclusions").trim()};try{await m.put(`/sites/${e}/waf`,l);let o=document.querySelector(".waf-plugin-select"),d=o?[...o.selectedOptions].map(u=>u.value):[...document.querySelectorAll(".waf-plugin-pill.active")].map(u=>u.dataset.plugin);await m.put(`/sites/${e}/waf/plugins`,d),c.success("WAF override saved \u2014 engine recompiling in background")}catch(o){c.error(o.message)}finally{i.disabled=!1,i.innerHTML=n}},{signal:a}),t.querySelector("#waf-import")?.addEventListener("change",async s=>{let i=s.target.files[0];if(!i)return;let n=new FormData;n.append("file",i);try{let r=await fetch(`/api/sites/${e}/waf/import`,{method:"POST",headers:{"X-CSRF-Token":window.KP?.csrf??""},body:n}),l=r.status===204?null:await r.json().catch(()=>null);if(!r.ok)throw new Error(l?.error||`HTTP ${r.status}`);await $t(e),c.success("WAF settings imported")}catch(r){c.error(r.message)}finally{s.target.value=""}})}var Ge=[{label:"Cache Flush",cmd:"cache flush"},{label:"Plugin List",cmd:"plugin list"},{label:"Theme List",cmd:"theme list"},{label:"User List",cmd:"user list"},{label:"Core Check",cmd:"core check-update"},{label:"Core Update",cmd:"core update"},{label:"Plugin Updates",cmd:"plugin update --all"},{label:"Theme Updates",cmd:"theme update --all"},{label:"Rewrite Flush",cmd:"rewrite flush"},{label:"Transient Delete",cmd:"transient delete --all"},{label:"Search Replace",cmd:"search-replace '' ''"}];function me(t){return`
        <div class="kp-wpcli">
            <div class="kp-log-controls" style="flex-wrap:wrap;gap:6px">
                ${Ge.map(e=>`
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
        </div>`}function ke(t,e){let a=t.querySelector("#wpcli-output"),s=t.querySelector("#wpcli-input"),i=t.querySelector("#wpcli-run"),n=t.querySelector("#wpcli-clear"),r=t.querySelector("#wpcli-status"),l=[],o=-1;function d(k,p=""){k.split(`
`).forEach(b=>{if(!b)return;let g=document.createElement("div");p?g.className=p:g.className=b.match(/error|fatal|critical/i)?"kp-log-line-err":b.match(/warning|warn/i)?"kp-log-line-warn":b.match(/success|done\]/i)?"kp-log-line-info":"",g.textContent=b,a.appendChild(g)}),a.scrollTop=a.scrollHeight}function u(k){if(k=k.trim(),!k)return;l.unshift(k),o=-1,d(`wp> ${k}`,"kp-log-line-info"),s.disabled=!0,i.disabled=!0,r&&(r.textContent="Running...");let p=location.protocol==="https:"?"wss":"ws",b=new WebSocket(`${p}://${location.host}/api/sites/${e}/wpcli`);b.onopen=()=>{b.send(JSON.stringify({command:k}))},b.onmessage=g=>{let h=g.data;if(h.trim()==="[done]"){b.close();return}if(h.startsWith("[info]")){d(h,"kp-muted");return}if(h.startsWith("[error]")){d(h,"kp-log-line-err");return}d(h)},b.onerror=()=>{d("[error] WebSocket connection failed","kp-log-line-err")},b.onclose=()=>{s.disabled=!1,i.disabled=!1,r&&(r.textContent="Ready"),s.focus()}}i.addEventListener("click",()=>{u(s.value),s.value=""}),s.addEventListener("keydown",k=>{if(k.key==="Enter"){u(s.value),s.value="",o=-1;return}if(k.key==="ArrowUp"){k.preventDefault(),o<l.length-1&&(o++,s.value=l[o]);return}k.key==="ArrowDown"&&(k.preventDefault(),o>0?(o--,s.value=l[o]):(o=-1,s.value=""))}),t.querySelectorAll('[data-action="wpcli-quick"]').forEach(k=>{k.addEventListener("click",()=>{let p=k.dataset.cmd;if(p.startsWith("search-replace")){s.value=p,s.focus();let b=p.indexOf("''")+1;s.setSelectionRange(b,b);return}u(p)})}),n.addEventListener("click",()=>{a.innerHTML=""});let v=f.go.bind(f);f.go=function(k,p={}){return v(k,p)},s.focus()}var Q=null,M=null;function be(t){let e=t.querySelector("#kp-site-pills"),a=t.querySelector("#kp-site-switcher"),s=t.querySelector("#kp-manage-pill"),i=t.querySelector("#kp-manage-dropdown");if(!e||!a)return;function n(l,o=!1){UIkit.switcher(a).show(l),e.querySelectorAll(":scope > li[data-pill]").forEach(d=>d.classList.remove("kp-pill-active")),o?(s?.classList.add("kp-pill-active"),i?.querySelectorAll("a[data-switcher]").forEach(d=>{d.classList.toggle("kp-dd-active",parseInt(d.dataset.switcher,10)===l)})):(s?.classList.remove("kp-pill-active"),i?.querySelectorAll("a[data-switcher]").forEach(d=>d.classList.remove("kp-dd-active")))}e.querySelectorAll(":scope > li[data-pill] > a").forEach(l=>{l.addEventListener("click",o=>{o.preventDefault();let d=parseInt(l.closest("li").dataset.pill,10);n(d,!1)})}),s?.querySelector(".kp-pill-dropdown-btn")?.addEventListener("click",l=>{l.stopPropagation(),i.hidden=!i.hidden,s.classList.toggle("kp-pill-active",!i.hidden)}),i?.querySelectorAll("a[data-switcher]").forEach(l=>{l.addEventListener("click",o=>{o.preventDefault(),i.hidden=!0,n(parseInt(l.dataset.switcher,10),!0)})}),document.addEventListener("click",l=>{i&&!s.contains(l.target)&&(i.hidden=!0)},{capture:!0}),UIkit.switcher(a).show(1)}function Qe(){return`
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
        </div>`}function Lt(t="",e="",a=!1){return`
        <div class="rp-route-row uk-flex uk-flex-middle uk-margin-small-bottom" style="gap:8px">
            <span>Host:</span><input class="uk-input kp-input" style="flex:1" placeholder="example.com" value="${t}" data-field="domain">
            <span>Upstream:</span><input class="uk-input kp-input" style="flex:2" placeholder="https://10.0.0.1:8080" value="${e}" data-field="upstream">
            <label style="white-space:nowrap;font-size:0.75rem;color:var(--kp-text-dim)" title="Send incoming domain as Host header instead of upstream hostname">
                <input type="checkbox" class="uk-checkbox" data-field="pass_host" ${a?"checked":""}> Pass Host
            </label>
            <button class="uk-button kp-btn-ghost kp-btn-sm rp-remove-row" uk-tooltip="Remove"><span uk-icon="trash"></span></button>
        </div>`}async function Ye(t){let e=document.getElementById("rp-routes-list");if(e)try{let a=await m.get(`/sites/${t}/rp-routes`);e.innerHTML=a.length?a.map(s=>Lt(s.Domain,s.Upstream,s.PassHost)).join(""):Lt()}catch(a){c.error("Failed to load routes: "+a.message)}}function Ze(t,e){t.addEventListener("click",async a=>{if(a.target.closest("#rp-add-row")){document.getElementById("rp-routes-list").insertAdjacentHTML("beforeend",Lt());return}if(a.target.closest(".rp-remove-row")){a.target.closest(".rp-route-row").remove();return}if(!a.target.closest("#rp-save-btn"))return;let s=a.target.closest("#rp-save-btn"),i=s.innerHTML;s.disabled=!0,s.innerHTML='<div uk-spinner="ratio: 0.6"></div> Saving...';let n=[...document.querySelectorAll(".rp-route-row")].map(r=>({Domain:r.querySelector('[data-field="domain"]').value.trim(),Upstream:r.querySelector('[data-field="upstream"]').value.trim(),PassHost:r.querySelector('[data-field="pass_host"]').checked})).filter(r=>r.Domain&&r.Upstream);try{await m.put(`/sites/${e}/rp-routes`,n),c.success("Routes saved")}catch(r){c.error(r.message)}finally{s.disabled=!1,s.innerHTML=i}},{signal:Q.signal})}function ta(t){return t.endsWith("-nginx")?"world":t.endsWith("-php")?"code":t.endsWith("-db")?"database":t.endsWith("-redis")?"server":t.endsWith("-varnish")?"grid":t.endsWith("-pma")?"table":t.endsWith("-app")?"laptop":"bolt"}function ve(t){let e=t.split("-").pop();return{nginx:"Nginx",php:"PHP-FPM",db:"MariaDB",redis:"Redis",varnish:"Varnish",pma:"phpMyAdmin",app:"App"}[e]??e}function Et(t){switch(t){case"healthy":return"var(--kp-success)";case"unhealthy":return"var(--kp-danger)";case"starting":return"var(--kp-warning)";default:return"var(--kp-text-dim)"}}function ea(t){return!t||!t.length?"":t.filter(e=>!e.name.endsWith("-infra")).map(e=>`
            <span class="kp-health-badge"
                data-container="${e.name}"
                title="Restart the Container"
                style="cursor:pointer;color:${Et(e.status)}">
                <span uk-icon="icon: ${ta(e.name)}; ratio: 1.1"></span>
                <span class="kp-health-badge-label">${ve(e.name)}</span>
            </span>
        `).join("")}function aa(t,e){M&&(M.close(),M=null);let a=document.getElementById("sd-health-badges");if(!a)return;let s=location.protocol==="https:"?"wss":"ws";M=new WebSocket(`${s}://${location.host}/api/sites/${e}/health/stream`),M.onmessage=i=>{try{let n=JSON.parse(i.data);a.innerHTML=ea(n),a.querySelectorAll(".kp-health-badge").forEach(r=>{r.addEventListener("click",async()=>{r.style.color=Et("starting");let l=r.dataset.container,o=l.split("-").pop();try{await m.post(`/sites/${e}/containers/${o}/restart`),c.success(`${ve(l)} restarted`)}catch(d){r.style.color=Et("none"),c.error(d.message)}})})}catch{}},M.onerror=()=>{},M.onclose=()=>{M=null}}async function ge(t,{id:e}){let[{site:a,domains:s,sftp:i},n,r]=await Promise.all([m.get(`/sites/${e}`),m.get("/sites"),m.get(`/sites/${e}/configs`)]),l=Array.isArray(n)?n:[],o=a.SiteType===1||a.SiteType===2,d=a.SiteType===6,u=[1,2,4,5].includes(a.SiteType);if(t.innerHTML=`
        <div class="kp-view-header">
            <div class="uk-flex uk-flex-middle" style="gap:12px">
                <button class="kp-btn-icon" id="sd-back"><span uk-icon="arrow-left"></span></button>
                <div class="kp-site-nav-wrap">
                    <select id="sd-site-nav" class="uk-select kp-select">
                        ${l.map(p=>`<option value="${p.ID}" ${p.ID===a.ID?"selected":""}>${p.Name}</option>`).join("")}
                    </select>
                    <span class="kp-site-nav-arrow">&#9660;</span>
                </div>
                ${d?"":A(a.SiteStatus)}
            </div>
            <div class="uk-flex" style="gap:8px;flex-wrap:wrap">
                ${d?"":`
                ${a.SiteStatus===1?`<button class="uk-button kp-btn-ghost kp-btn-sm" data-action="stop" data-id="${e}" uk-tooltip="Stop the Site"><span uk-icon="ban"></span></button>`:`<button class="uk-button kp-btn-ghost kp-btn-sm" data-action="start" data-id="${e}" uk-tooltip="Start the Site"><span uk-icon="play"></span></button>`}
                <button class="uk-button kp-btn-ghost kp-btn-sm" data-action="restart" data-id="${e}" uk-tooltip="Restart the Site"><span uk-icon="refresh"></span></button>
                <button class="uk-button kp-btn-ghost kp-btn-sm" data-action="flush" data-id="${e}" uk-tooltip="Flush the Caches"><span uk-icon="bolt"></span></button>
                <button class="uk-button kp-btn-ghost kp-btn-sm kp-btn-recreate" id="sd-recreate" uk-tooltip="Recreate &amp; Update the Pod"><span uk-icon="history"></span></button>
                <button class="uk-button kp-btn-ghost kp-btn-sm" id="sd-clone" uk-tooltip="Clone the Site"><span uk-icon="move"></span></button>
                `}
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
            <li>${Qe()}</li>
            <li>${vt(e,a.SiteType)}</li>
            <li>${St(e,a.SiteType)}</li>
            <li>${z(e)}</li>
            <li id="waf-tab-panel"></li>
            <li>${yt()}</li>
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
                    ${o?'<a href="#" data-switcher="3"><span uk-icon="icon: code; ratio: 0.85"></span> PHP</a>':""}
                    <a href="#" data-switcher="${o?4:3}"><span uk-icon="icon: database; ratio: 0.85"></span> MariaDB</a>
                    <a href="#" data-switcher="${o?5:4}"><span uk-icon="icon: server; ratio: 0.85"></span> Redis</a>
                    <a href="#" data-switcher="${o?6:5}"><span uk-icon="icon: world; ratio: 0.85"></span> Varnish</a>
                    <hr>
                    <div class="kp-pill-dropdown-section">Security</div>
                    <a href="#" data-switcher="${o?8:7}"><span uk-icon="icon: lock; ratio: 0.85"></span> Security</a>
                    <a href="#" data-switcher="${o?9:8}"><span uk-icon="icon: lifesaver; ratio: 0.85"></span> WAF</a>
                    <a href="#" data-switcher="${o?10:9}"><span uk-icon="icon: user; ratio: 0.85"></span> Basic Auth</a>
                    <hr>
                    <div class="kp-pill-dropdown-section">Tools</div>
                    ${a.SiteType===1?`<a href="#" data-switcher="${o?11:10}"><span uk-icon="icon: file-text; ratio: 0.85"></span> WP-CLI</a>`:""}
                    <a href="#" data-switcher="${a.SiteType===1?o?12:11:o?11:10}"><span uk-icon="icon: history; ratio: 0.85"></span> Backups</a>
                    ${u?`<a href="#" data-switcher="${a.SiteType===1?o?13:12:o?12:11}"><span uk-icon="icon: clock; ratio: 0.85"></span> Crons</a>`:""}
                    <a href="#" data-switcher="${a.SiteType===1?o?14:13:o?13:12}"><span uk-icon="icon: forward; ratio: 0.85"></span> Redirects</a>
                    <a href="#" data-switcher="files"><span uk-icon="icon: folder; ratio: 0.85"></span> Files</a>
                </div>
            </li>
            <li data-pill="1"><a href="#">Stats</a></li>
            <li data-pill="${o?7:6}"><a href="#">Logs</a></li>
        </ul>

        <!-- switcher panels (driven by pills above) -->
        <ul class="uk-switcher" id="kp-site-switcher">
            <li>${ne(a,s??[],i,a.ParentID??0,l.find(p=>p.ID===a.ParentID)?.Name??null)}</li>
            <li>${vt(e,a.SiteType)}</li>
            <li>${X(e,1,r[1])}</li>
            ${o?`<li>${X(e,2,r[2])}</li>`:""}
            <li>${X(e,3,r[3])}</li>
            <li>${X(e,4,r[4])}</li>
            <li>${jt(e,r[5])}</li>
            <li>${St(e,a.SiteType)}</li>
            <li>${z(e)}</li>
            <li id="waf-tab-panel"></li>
            <li>${yt()}</li>
            ${a.SiteType===1?`<li>${me(e)}</li>`:""}
            <li>${Nt(e)}</li>
            ${u?`<li>${Vt(e)}</li>`:""}
            <li>${re()}</li>
            <li>${Zt(e)}</li>
        </ul>`}`,document.getElementById("sd-back").addEventListener("click",()=>f.go("sites")),document.getElementById("sd-edit").addEventListener("click",()=>at(a)),document.getElementById("sd-site-nav")?.addEventListener("change",p=>{f.go("site-detail",{id:p.target.value})}),lt(t),B(t),ee(t,e),Q&&Q.abort(),Q=new AbortController,pe(t,e,Q.signal),$t(e),d){Ze(t,e),Ye(e),ht(t,e,a.SiteType),ft(e,a.SiteType),wt(t,e),V(e),be(t);return}document.getElementById("sd-recreate").addEventListener("click",async()=>{$("Recreating Pod","Recreating containers for this site...");try{await m.post(`/sites/${e}/recreate`),w(),c.success("Pod recreated"),f.go("site-detail",{id:e})}catch(p){w(),c.error(p.message)}}),document.getElementById("sd-clone")?.addEventListener("click",async()=>{let p=await et(a.Name);if(p){$("Cloning Site","Copying files and database \u2014 this may take a few minutes...");try{await m.post(`/sites/${e}/clone`,{name:p},6e5),w(),c.success(`Site cloned as '${p}'`),f.go("sites")}catch(b){w(),c.error(b.message)}}}),t.querySelectorAll("[data-action]:not([data-action='wpcli-quick'])").forEach(p=>{p.addEventListener("click",async()=>{let b=p.dataset.action;if(b==="flush"){try{await m.post(`/sites/${e}/flush`),c.success("Caches flushed")}catch(h){c.error(h.message)}return}$(`${{start:"Starting",stop:"Stopping",restart:"Restarting",update:"Updating"}[b]??b} Pod`,"Please wait...");try{await m.post(`/sites/${e}/${b}`),w(),c.success(`Site ${b} successful`),f.go("site-detail",{id:e})}catch(h){w(),c.error(h.message)}})}),Ot(t,e),oe(t,e),a.SiteType===1&&ke(t,e),le(t,e,a),Wt(t,e),W(t,e),u&&(Jt(t,e),rt(t,e)),ue(t,e),de(e);let v=t.querySelector("#kp-site-switcher"),k=t.querySelector('a[data-switcher="files"]');v&&k&&(k.dataset.switcher=String(v.children.length-1)),te(t,e),C(e),aa(t,e),ht(t,e,a.SiteType),ft(e,a.SiteType),be(t),wt(t,e),V(e),se(s??[])}async function dt(t){let e=document.getElementById("totp-qr-img"),a=document.getElementById("totp-qr-wrap");if(!e||!a)return;if(a.querySelectorAll(".totp-uri-text").forEach(i=>i.remove()),typeof QRCode<"u")try{let i=await new Promise((n,r)=>{QRCode.toDataURL(t,{width:220,margin:2},(l,o)=>{l?r(l):n(o)})});e.src=i,e.style.display="";return}catch{}let s=document.createElement("p");s.className="totp-uri-text kp-muted uk-text-small",s.style.wordBreak="break-all",s.textContent=t,a.appendChild(s)}function ut(t){document.getElementById("kp-backup-codes-modal")?.remove();let a=`
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
`),n=document.getElementById("kp-backup-copy-btn");if(navigator.clipboard)navigator.clipboard.writeText(i).then(()=>{n.textContent="Copied!"});else{let r=document.createElement("textarea");r.value=i,r.style.cssText="position:fixed;opacity:0",document.body.appendChild(r),r.select();try{document.execCommand("copy"),n.textContent="Copied!"}catch{}r.remove()}}),document.getElementById("kp-backup-done-btn").addEventListener("click",()=>{s.hide(),document.getElementById("kp-backup-codes-modal")?.remove(),f.go("users")})}function he(t){document.body.insertAdjacentHTML("beforeend",`
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
        </div>`);let a=UIkit.modal("#kp-create-user-modal");a.show(),document.getElementById("create-user-form").addEventListener("submit",async s=>{s.preventDefault();let i=s.target.querySelector('[type="submit"]'),n=i.innerHTML;i.disabled=!0,i.innerHTML='<div uk-spinner="ratio: 0.6"></div> Creating...';let r=new FormData(s.target),l={fname:r.get("fname").trim(),lname:r.get("lname").trim(),uname:r.get("uname").trim(),email:r.get("email").trim(),phone:r.get("phone").trim(),password:r.get("password"),role:parseInt(r.get("role")),notify_email:r.get("notify_email")==="on",notify_sms:r.get("notify_sms")==="on"};try{let o=F(await m.post("/users",l));document.getElementById("users-table-body").insertAdjacentHTML("beforeend",Tt(o)),c.success(`User '${o.uname}' created`),document.getElementById("create-user-form").style.display="none",document.getElementById("cu-totp-section").style.display="",sa(o.id,a)}catch(o){c.error(o.message),i.disabled=!1,i.innerHTML=n}}),document.getElementById("kp-create-user-modal").addEventListener("hidden",()=>document.getElementById("kp-create-user-modal")?.remove())}function sa(t,e){let a=()=>{e.hide(),document.getElementById("kp-create-user-modal")?.remove(),f.go("users")};document.getElementById("cu-totp-skip-btn").addEventListener("click",a),document.getElementById("cu-totp-setup-btn").addEventListener("click",async()=>{let s=document.getElementById("cu-totp-setup-btn");s.disabled=!0,s.textContent="Setting up\u2026";try{let i=await m.post(`/users/${t}/totp/setup`,{});document.getElementById("totp-secret-text").textContent=i.secret,document.getElementById("totp-setup-area").style.display="",document.getElementById("cu-totp-skip-btn").style.display="none",await dt(i.uri)}catch(i){c.error(i.message),s.disabled=!1,s.textContent="Enable TOTP"}}),document.getElementById("cu-totp-confirm-btn").addEventListener("click",async()=>{let s=document.getElementById("totp-confirm-code").value.trim();if(s.length!==6){c.error("Enter a 6-digit code");return}let i=document.getElementById("cu-totp-confirm-btn");i.disabled=!0;try{let n=await m.post(`/users/${t}/totp/confirm`,{code:s});e.hide(),document.getElementById("kp-create-user-modal")?.remove(),c.success("TOTP enabled"),n.backup_codes?.length?ut(n.backup_codes):f.go("users")}catch(n){c.error(n.message),i.disabled=!1}})}async function fe(t,e){document.getElementById("kp-edit-user-modal")?.remove();let a;try{a=F(await m.get(`/users/${e}`))}catch(d){c.error(d.message);return}let s=window.KP?.user?.role===99,i=`
        <div id="kp-edit-user-modal" uk-modal>
            <div class="uk-modal-dialog kp-modal uk-modal-body uk-width-large">
                <button class="uk-modal-close-default" type="button" uk-close></button>
                <h3 class="kp-view-title">Edit User \u2014 ${a.uname}</h3>
                <form id="edit-user-form" class="uk-form-stacked uk-margin-top">
                    <div class="uk-grid-small" uk-grid>
                        ${s?`
                        <div class="uk-width-1-1">
                            <label class="kp-label">Username</label>
                            <input class="uk-input kp-input" name="uname" type="text" value="${a.uname}" autocomplete="off">
                        </div>`:""}
                        <div class="uk-width-1-2@s">
                            <label class="kp-label">First Name</label>
                            <input class="uk-input kp-input" name="fname" type="text" value="${a.fname}" required>
                        </div>
                        <div class="uk-width-1-2@s">
                            <label class="kp-label">Last Name</label>
                            <input class="uk-input kp-input" name="lname" type="text" value="${a.lname}" required>
                        </div>
                        <div class="uk-width-1-2@s">
                            <label class="kp-label">Email</label>
                            <input class="uk-input kp-input" name="email" type="email" value="${a.email}" required>
                        </div>
                        <div class="uk-width-1-2@s">
                            <label class="kp-label">Phone</label>
                            <input class="uk-input kp-input" name="phone" type="tel" value="${a.phone||""}" required>
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
        </div>`;document.body.insertAdjacentHTML("beforeend",i);let n=UIkit.modal("#kp-edit-user-modal");n.show(),document.getElementById("edit-user-form").addEventListener("submit",async d=>{d.preventDefault();let u=d.target.querySelector('[type="submit"]'),v=u.innerHTML;u.disabled=!0,u.innerHTML='<div uk-spinner="ratio: 0.6"></div> Saving...';let k=new FormData(d.target),p={fname:k.get("fname").trim(),lname:k.get("lname").trim(),email:k.get("email").trim(),phone:k.get("phone").trim(),notify_email:k.get("notify_email")==="on",notify_sms:k.get("notify_sms")==="on"};if(s){p.role=parseInt(k.get("role"));let g=k.get("uname");g&&(p.uname=g.trim())}let b=k.get("password");b&&(p.password=b);try{await m.put(`/users/${e}`,p),n.hide(),document.getElementById("kp-edit-user-modal")?.remove(),c.success("User updated"),f.go("users")}catch(g){c.error(g.message),u.disabled=!1,u.innerHTML=v}});let r=document.getElementById("totp-setup-btn");r&&r.addEventListener("click",async()=>{r.disabled=!0,r.textContent="Setting up\u2026";try{let d=await m.post(`/users/${e}/totp/setup`,{});document.getElementById("totp-secret-text").textContent=d.secret,document.getElementById("totp-setup-area").style.display="",await dt(d.uri)}catch(d){c.error(d.message),r.disabled=!1,r.textContent="Enable TOTP"}});let l=document.getElementById("totp-confirm-btn");l&&l.addEventListener("click",async()=>{let d=document.getElementById("totp-confirm-code").value.trim();if(d.length!==6){c.error("Enter a 6-digit code");return}l.disabled=!0;try{let u=await m.post(`/users/${e}/totp/confirm`,{code:d});n.hide(),document.getElementById("kp-edit-user-modal")?.remove(),c.success("TOTP enabled"),u.backup_codes?.length?ut(u.backup_codes):f.go("users")}catch(u){c.error(u.message),l.disabled=!1}});let o=document.getElementById("totp-disable-btn");o&&o.addEventListener("click",async()=>{o.disabled=!0;try{await m.delete(`/users/${e}/totp`),c.success("TOTP disabled"),n.hide(),document.getElementById("kp-edit-user-modal")?.remove(),f.go("users")}catch(d){c.error(d.message),o.disabled=!1}}),document.getElementById("kp-edit-user-modal").addEventListener("hidden",()=>document.getElementById("kp-edit-user-modal")?.remove())}async function ye(t){if(!q()){t.innerHTML=_("Access denied");return}let e=await m.get("/users");t.innerHTML=`
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
                    ${e.map(a=>Tt(F(a))).join("")}
                </tbody>
            </table>
            </div>
        </div>`,document.getElementById("users-new-btn").addEventListener("click",()=>he(t)),na(t)}function Tt(t){let e=t.role===99?'<span class="kp-badge kp-badge-admin">Admin</span>':'<span class="kp-badge kp-badge-manager">Manager</span>',a=[t.notify_email?'<span uk-icon="icon: mail; ratio: 0.85" uk-tooltip="Email notifications on" style="color:var(--kp-success)"></span>':'<span uk-icon="icon: mail; ratio: 0.85" style="color:var(--kp-text-dim)" uk-tooltip="Email notifications off"></span>',t.notify_sms?'<span uk-icon="icon: receiver; ratio: 0.85" uk-tooltip="SMS notifications on" style="color:var(--kp-success)"></span>':'<span uk-icon="icon: receiver; ratio: 0.85" style="color:var(--kp-text-dim)" uk-tooltip="SMS notifications off"></span>'].join(" ");return`<tr data-user-id="${t.id}">
        <td><strong>${t.fname} ${t.lname}</strong></td>
        <td><span style="font-family:monospace">${t.uname}</span></td>
        <td>${t.email}</td>
        <td>${e}</td>
        <td class="uk-text-center">${t.totp_enabled?'<span uk-icon="icon: check; ratio: 0.9" style="color:var(--kp-success)"></span>':'<span uk-icon="icon: close; ratio: 0.9" style="color:var(--kp-text-dim)"></span>'}</td>
        <td class="uk-text-center">${a}</td>
        <td><span class="kp-muted">${t.created}</span></td>
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
    </tr>`}function na(t){t.addEventListener("click",async e=>{let a=e.target.closest('[data-action="delete-user"]');if(!(!a||!await L("Delete User","Delete this user? This cannot be undone.")))try{await m.delete(`/users/${a.dataset.uid}`),a.closest("tr").remove(),c.success("User deleted")}catch(i){c.error(i.message)}}),t.addEventListener("click",async e=>{let a=e.target.closest('[data-action="edit-user"]');a&&fe(t,a.dataset.uid)})}f.register("dashboard",t=>Dt(t));f.register("sites",t=>Mt(t));f.register("site-detail",(t,e)=>ge(t,e));f.register("users",t=>ye(t));f.register("settings",t=>Ft(t));f.register("security",t=>Rt(t));f.register("admin-logs",t=>_t(t));f.register("audit-log",t=>qt(t));document.addEventListener("keydown",t=>{let e=t.target;e?.matches?.("input, textarea, select, [contenteditable='true']")&&e.id!=="wpcli-input"&&["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","Home","End"].includes(t.key)&&t.stopPropagation()},!0);document.addEventListener("click",t=>{let e=t.target.closest("[data-view]");e&&(t.preventDefault(),f.go(e.dataset.view))});document.addEventListener("click",async t=>{let e=t.target.closest("[data-action]");if(!e)return;t.stopPropagation();let{action:a,id:s}=e.dataset;switch(a){case"manage":f.go("site-detail",{id:s});break;case"start":await pt(s,"start","Starting Site","Starting all containers - please wait...");break;case"stop":await pt(s,"stop","Stopping Site","Gracefully stopping all containers - please wait...");break;case"restart":await pt(s,"restart","Restarting Site","Restarting all containers - please wait...");break;case"flush":await pt(s,"flush","Flushing Caches","Clearing container caches - please wait...");break;case"edit":{let i=await m.get(`/sites/${s}`);at(i.site);break}case"clone":{let i=await et(e.dataset.name??s);if(!i)break;$("Cloning Site","Copying files and database \u2014 this may take a few minutes...");try{let n=await m.post(`/sites/${s}/clone`,{name:i}),r=!1,l=0;for(;!r&&l<60;)await new Promise(d=>setTimeout(d,3e3)),r=(await m.get("/sites")).some(d=>d.ID===n.id&&d.SiteStatus===1),l++;w(),r?(c.success(`Site cloned as '${i}'`),f.go("sites")):c.error("Clone timed out \u2014 check container logs")}catch(n){w(),c.error(n.message)}break}case"delete":await ia(s);break;case"recreate":$("Recreating Pod","Recreating containers for this site - this may take a few minutes...");try{await m.post(`/sites/${s}/recreate`),w(),c.success("Pod recreated"),f.go("sites")}catch(i){w(),c.error(i.message)}break}});document.addEventListener("kp:bulk-action",async t=>{let{action:e,ids:a}=t.detail;if(!a.length)return;let s={start:"Starting",stop:"Stopping",restart:"Restarting",flush:"Flushing Caches",recreate:"Recreating"},i=e==="recreate"?"Please hold while we update your Pods":"Please wait...",n=e==="recreate"?{prune:!0}:void 0,r=e==="recreate"?1200*1e3:void 0;$(`${s[e]} ${a.length} Site${a.length!==1?"s":""}`,i);let l=await Promise.allSettled(a.map(d=>m.post(`/sites/${d}/${e}`,n,r)));w();let o=l.filter(d=>d.status==="rejected").length;o===0?c.success(`${e.charAt(0).toUpperCase()+e.slice(1)} complete for ${a.length} site${a.length!==1?"s":""}`):c.error(`${o} of ${a.length} sites failed \u2014 check logs`),["start","stop","restart","recreate"].includes(e)&&f.go("sites")});async function pt(t,e,a,s){$(a,s);try{await m.post(`/sites/${t}/${e}`),w(),c.success(a+" complete")}catch(i){w(),c.error(i.message)}}async function ia(t){if(!await L("Delete Site",`This will stop and permanently remove the pod and all its data. Are you sure?

A final backup will be created before deletion. This may take a moment.`))return;$("Deleting Site","Creating final backup and removing the pod \u2014 please wait...");let a;try{a=await fetch(`/api/sites/${t}`,{method:"DELETE",headers:{"X-CSRF-Token":window.KP?.csrf??""}})}catch{}if(w(),a?.ok&&a.headers.get("Content-Type")?.includes("gzip")){let r=(a.headers.get("Content-Disposition")??"").match(/filename="([^"]+)"/)?.[1]??`${t}_final.tar.gz`,l=await a.blob(),o=document.createElement("a");o.href=URL.createObjectURL(l),o.download=r,o.click(),URL.revokeObjectURL(o.href),c.success("Site deleted. Final backup downloaded."),f.go("sites");return}let s=!1,i=0;for(;!s&&i<10;){try{await new Promise(r=>setTimeout(r,2e3)),s=!(await m.get("/sites")).find(r=>r.ID===parseInt(t))}catch{}i++}s?(c.success("Site deleted. Final backup saved to S3."),f.go("sites")):c.error("Delete failed - site still exists after 20s")}if(window.KP?.user?.role===99){let t=document.getElementById("kp-resource-warning"),e=document.getElementById("kp-resource-warning-msg"),a=async()=>{try{let s=await m.get("/settings/resource-warning");s?.active&&t&&e?(e.textContent=`${s.current_mb}MB used, threshold ${s.threshold_mb}MB \u2014 throttling ${s.offender}.`,t.style.display=""):t&&(t.style.display="none")}catch{}};a(),setInterval(a,3e4)}window.addEventListener("hashchange",()=>{if(f._ownHashChange)return;let{view:t,params:e}=kt();f.go(t,e)});(()=>{let t=document.getElementById("kp-totop");if(!t)return;let e=()=>{t.classList.toggle("is-visible",window.scrollY>150)};window.addEventListener("scroll",e,{passive:!0}),e(),t.addEventListener("click",()=>{window.scrollTo({top:0,behavior:"smooth"})})})();var{view:oa,params:la}=kt();f.go(oa,la);})();
