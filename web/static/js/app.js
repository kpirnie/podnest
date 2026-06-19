"use strict";(()=>{var u={async _req(t,e,a,s=6e4){let n=new AbortController,i=setTimeout(()=>n.abort(),s),r={method:t,headers:{"Content-Type":"application/json"},signal:n.signal};t!=="GET"&&t!=="HEAD"&&(r.headers["X-CSRF-Token"]=window.KP?.csrf??""),a!==void 0&&(r.body=JSON.stringify(a));try{let o=await fetch("/api"+e,r);clearTimeout(i);let l=o.status===204?null:await o.json().catch(()=>null);if(o.status===401)return window.location.href="/login?msg=Your+session+has+expired+%E2%80%94+please+log+in+again",null;if(!o.ok)throw new Error(l?.error||`HTTP ${o.status}`);return l}catch(o){throw clearTimeout(i),o}},get:t=>u._req("GET",t),post:(t,e)=>u._req("POST",t,e),put:(t,e)=>u._req("PUT",t,e),delete:t=>u._req("DELETE",t),patch:(t,e)=>u._req("PATCH",t,e)};var vt=()=>'<div class="kp-spinner"><div uk-spinner="ratio: 1.25"></div></div>',L=t=>`<div class="kp-empty">
        <div class="kp-empty-icon" uk-icon="icon: warning; ratio: 2.5"></div>
        <div class="kp-empty-text">${t}</div>
    </div>`,z=(t,e)=>`<div class="kp-empty">
        <div class="kp-empty-icon" uk-icon="icon: ${t}; ratio: 2.5"></div>
        <div class="kp-empty-text">${e}</div>
    </div>`,B=t=>{let e={1:["running","Running"],2:["stopped","Stopped"],3:["restarting","Restarting"],4:["error","Error"]},[a,s]=e[t]||["stopped","Unknown"];return`<span class="kp-status kp-status-${a}">${s}</span>`},le=t=>({3:"8.2",4:"8.3",5:"8.4",6:"8.5"})[t]||"?",H=t=>({1:"WordPress",2:"PHP",3:"Static",4:"Node.js",5:".NET",6:"Reverse Proxy"})[t]||"?",_=()=>window.KP.user.role===window.KP.roles.admin,q=t=>{switch(t.SiteType){case 1:case 2:return`PHP ${le(t.PHPVersion)}`;case 4:return`Node ${{2:"22",4:"24",5:"25",6:"26"}[t.RuntimeVersion]||"?"}`;case 5:return`.NET ${{1:"8.0",2:"9.0",3:"10.0"}[t.RuntimeVersion]||"?"}`;case 6:return"Reverse Proxy";default:return""}},D=t=>({id:t.id??t.ID,uname:t.uname??t.UName,uhash:t.uhash??t.UHash,fname:t.fname??t.FName,lname:t.lname??t.LName,email:t.email??t.Email,phone:t.phone??t.Phone,role:t.role??t.Role,totp_enabled:t.totp_enabled??!1,notify_email:t.notify_email??!1,notify_sms:t.notify_sms??!1,created:t.created??t.Created});function $(t,e){return new Promise(a=>{document.getElementById("kp-confirm-title").textContent=t,document.getElementById("kp-confirm-message").textContent=e;let s=UIkit.modal("#kp-confirm-modal");document.getElementById("kp-confirm-ok").addEventListener("click",()=>{s.hide(),a(!0)},{once:!0}),s.show(),document.getElementById("kp-confirm-modal").addEventListener("hidden",()=>a(!1),{once:!0})})}function S(t,e){let a=`
        <div id="kp-progress-modal" uk-modal="bg-close: false; esc-close: false; keyboard: false">
            <div class="uk-modal-dialog kp-modal uk-modal-body uk-text-center" style="max-width:420px">
                <div uk-spinner="ratio: 1.5" style="color:var(--kp-blue)"></div>
                <h3 class="uk-modal-title uk-margin-small-top" id="kp-progress-title">${t}</h3>
                <p class="kp-muted uk-text-small" id="kp-progress-message">${e}</p>
                <p class="kp-muted">
                    This may take several minutes while the task(s) complete, make sure to keep screen open until it has completed.
                </p>
            </div>
        </div>`;document.body.insertAdjacentHTML("beforeend",a),UIkit.modal("#kp-progress-modal").show()}function y(){let t=document.getElementById("kp-progress-modal");t&&(UIkit.modal(t).hide(),setTimeout(()=>t.remove(),300))}function V(t){return new Promise(e=>{let a="kp-clone-modal",s=`
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
            </div>`;document.body.insertAdjacentHTML("beforeend",s);let n=UIkit.modal(`#${a}`),i=document.getElementById("kp-clone-name"),r=document.getElementById("kp-clone-ok"),o=document.getElementById("kp-clone-cancel"),l=p=>{n.hide(),setTimeout(()=>document.getElementById(a)?.remove(),300),e(p)};r.addEventListener("click",()=>l(i.value.trim()||null),{once:!0}),o.addEventListener("click",()=>l(null),{once:!0}),document.getElementById(a).addEventListener("hidden",()=>l(null),{once:!0}),n.show(),setTimeout(()=>i.focus(),150),i.addEventListener("keydown",p=>{p.key==="Enter"&&r.click()})})}function ot(t,e,a){return new Promise(s=>{let n="kp-sync-modal",i=t==="pull",r=i?"Pull From Parent":"Push To Parent",o=i?"cloud-download":"cloud-upload",l=i?a:e,p=i?e:a,d=`
            <div id="${n}" uk-modal>
                <div class="uk-modal-dialog kp-modal uk-modal-body" style="max-width:460px">
                    <h3 class="uk-modal-title">${r}</h3>
                    <p class="kp-muted uk-text-small uk-margin-small-bottom">
                        This will overwrite all files and database content on
                        <strong>${p}</strong> with data from <strong>${l}</strong>.
                        This action cannot be undone.
                    </p>
                    <p class="kp-muted uk-text-small" style="color:var(--kp-red, #e05c5c)">
                        <span uk-icon="icon: warning; ratio: 0.85"></span>
                        <strong>${p}</strong> will be temporarily unavailable during the sync.
                    </p>
                    <div class="uk-flex uk-flex-right uk-margin-top" style="gap:8px">
                        <button class="uk-button kp-btn-ghost uk-modal-close" id="kp-sync-cancel">Cancel</button>
                        <button class="uk-button kp-btn-primary" id="kp-sync-ok">
                            <span uk-icon="${o}"></span> ${r}
                        </button>
                    </div>
                </div>
            </div>`;document.body.insertAdjacentHTML("beforeend",d);let b=UIkit.modal(`#${n}`),k=document.getElementById("kp-sync-ok"),m=document.getElementById("kp-sync-cancel"),v=g=>{b.hide(),setTimeout(()=>document.getElementById(n)?.remove(),300),s(g)};k.addEventListener("click",()=>v(!0),{once:!0}),m.addEventListener("click",()=>v(!1),{once:!0}),document.getElementById(n).addEventListener("hidden",()=>v(!1),{once:!0}),b.show()})}var h={routes:{},_ownHashChange:!1,register(t,e){this.routes[t]=e},async go(t,e={}){let a=Object.keys(e).length?t+"/"+Object.values(e).join("/"):t;this._ownHashChange=!0,window.location.hash=a,setTimeout(()=>{this._ownHashChange=!1},0),document.querySelectorAll(".kp-nav-link").forEach(i=>{i.classList.toggle("kp-active",i.dataset.view===t)}),document.querySelectorAll(".kp-bn-item[data-view]").forEach(i=>{i.classList.toggle("kp-active",i.dataset.view===t)});let s=this.routes[t];if(!s)return;let n=document.getElementById("kp-view");n.innerHTML=vt();try{await s(n,e)}catch(i){n.innerHTML=L(i.message)}}};function lt(){let e=(window.location.hash.replace("#","")||"dashboard").split("/"),a=e[0],s={};return a==="site-detail"&&e[1]&&(s.id=e[1]),{view:a,params:s}}var c={show(t,e="info",a=7e3){let s={success:"check",error:"warning",info:"info"},n=document.createElement("div");n.className=`kp-toast kp-toast-${e}`,n.innerHTML=`<span uk-icon="${s[e]||"info"}"></span><span>${t}</span>`,document.getElementById("kp-toasts").appendChild(n),UIkit.icon(n.querySelector("[uk-icon]")),setTimeout(()=>n.remove(),a)},success:t=>c.show(t,"success"),error:t=>c.show(t,"error"),info:t=>c.show(t,"info")};async function J(t){let e=`
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
        </div>`;document.body.insertAdjacentHTML("beforeend",e);let a=UIkit.modal("#kp-edit-site-modal"),s=document.getElementById("es-site-type"),n=document.getElementById("es-php-version-wrap"),i=document.getElementById("es-node-version-wrap"),r=document.getElementById("es-dotnet-version-wrap"),o=document.getElementById("es-start-command-wrap"),l=document.getElementById("es-wordpress-wrap");a.show();let p=d=>{n.classList.toggle("uk-hidden",d!==1&&d!==2||d===6),i.classList.toggle("uk-hidden",d!==4),r.classList.toggle("uk-hidden",d!==5),o.classList.toggle("uk-hidden",d!==4&&d!==5),l.classList.toggle("uk-hidden",d!==1)};p(t.SiteType),s.addEventListener("change",()=>p(parseInt(s.value))),document.getElementById("edit-site-form").addEventListener("submit",async d=>{d.preventDefault();let b=d.target.querySelector('[type="submit"]'),k=b.innerHTML;b.disabled=!0,b.innerHTML='<div uk-spinner="ratio: 0.6"></div> Saving...';let m=new FormData(d.target),v=parseInt(m.get("site_type")),g=null;v===4&&(g=parseInt(m.get("node_version"))),v===5&&(g=parseInt(m.get("dotnet_version")));let f={name:m.get("name").trim(),php_version:parseInt(m.get("php_version"))||3,site_type:v,runtime_version:g,start_command:m.get("start_command")?.trim()||""},w=v===1?m.get("install_wordpress")==="on":!1;try{if(await u.put(`/sites/${t.ID}`,f),a.hide(),document.getElementById("kp-edit-site-modal")?.remove(),v!==6){S("Applying Changes","Saving changes and recreating pod...");try{await u.post(`/sites/${t.ID}/recreate`,{install_wordpress:w}),y(),c.success("Site updated and pod recreated")}catch(x){y(),c.error("Site saved but pod recreate failed: "+x.message)}}else c.success("Site updated");h.go("site-detail",{id:String(t.ID)})}catch(x){c.error(x.message),b.disabled=!1,b.innerHTML=k}}),document.getElementById("kp-edit-site-modal").addEventListener("hidden",()=>document.getElementById("kp-edit-site-modal")?.remove())}var re=2e3;function ce(){return`
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
        </div>`}function de(t){let e=null,a=!1,s=t.querySelector("#admin-log-output"),n=t.querySelector("#admin-log-connect"),i=t.querySelector("#admin-log-disconnect"),r=t.querySelector("#admin-log-clear"),o=t.querySelector("#admin-log-autoscroll"),l=t.querySelector("#admin-log-status");function p(k){for(k.split(`
`).forEach(m=>{if(!m)return;let v=document.createElement("div");v.className=m.match(/WAF BLOCK/i)?"kp-log-line-err":m.match(/WAF DETECT/i)?"kp-log-line-warn":m.match(/error|crit|emerg/i)?"kp-log-line-err":m.match(/warn/i)?"kp-log-line-warn":m.match(/info|notice/i)?"kp-log-line-info":"",v.textContent=m,s.appendChild(v)});s.childElementCount>re;)s.removeChild(s.firstChild);o.checked&&(s.scrollTop=s.scrollHeight)}function d(){e&&(e.close(),e=null),a=!1,n.disabled=!1,i.disabled=!0,l&&(l.textContent="Disconnected")}n.addEventListener("click",()=>{d();let k=t.querySelector("#admin-log-source").value,m=t.querySelector("#admin-log-tail").value,v=location.protocol==="https:"?"wss":"ws",g=k==="waf"?`${v}://${location.host}/api/logs/waf?tail=${m}`:`${v}://${location.host}/api/logs/proxy?tail=${m}`;e=new WebSocket(g),e.onopen=()=>{a=!0,n.disabled=!0,i.disabled=!1,l&&(l.textContent=`Connected \u2014 ${k==="waf"?"WAF Log":"Proxy Access Log"}`)},e.onmessage=f=>p(f.data),e.onerror=()=>{},e.onclose=()=>{a=!1,n.disabled=!1,i.disabled=!0,l&&(l.textContent="Disconnected")}}),i.addEventListener("click",d),r.addEventListener("click",()=>{s.innerHTML=""}),t.querySelector("#admin-log-source").addEventListener("change",()=>{e&&e.readyState===WebSocket.OPEN&&(d(),n.click())});let b=h.go.bind(h);h.go=function(k,m={}){return e&&d(),b(k,m)}}function gt(t){t.innerHTML=ce(),de(t)}var G=50;function pe(t,e,a){let s=Math.max(1,Math.ceil(t.total/G)),n=(t.entries??[]).map(ht).join("")||'<tr><td colspan="8" class="uk-text-center" style="color:var(--kp-text-dim)">No records found</td></tr>';return`
        <div id="audit-log-panel">
            <div class="kp-view-header">
                <h1 class="kp-view-title" style="font-size:2rem;">Audit Log</h1>
            </div>

            <div class="kp-card uk-padding-small uk-margin-bottom">
                <div class="uk-flex uk-flex-middle uk-flex-wrap kp-filter-bar">
                    <input class="uk-input kp-input" id="al-filter-user" type="text"
                        placeholder="Username" value="${E(e.username)}">
                    <input class="uk-input kp-input" id="al-filter-action" type="text"
                        placeholder="Action" value="${E(e.action)}">
                    <input class="uk-input kp-input" id="al-filter-target" type="text"
                        placeholder="Target type" value="${E(e.target_type)}">
                    <input class="uk-input kp-input" id="al-filter-date-from" type="date"
                        value="${E(e.date_from)}">
                    <input class="uk-input kp-input" id="al-filter-date-to" type="date"
                        value="${E(e.date_to)}">
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
                <table class="uk-table uk-table-divider uk-table-small uk-table-middle uk-table-responsive uk-margin-remove">
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
                    <tbody id="al-table-body">${n}</tbody>
                </table>
            </div>

            ${s>1?`<div id="al-pager">${ft(a,s)}</div>`:'<div id="al-pager"></div>'}
        </div>`}function ht(t){let e=new Date(t.ts).toLocaleString(),a=t.username?`<span style="font-family:monospace">${E(t.username)}</span>`:'<span style="color:var(--kp-text-dim)">\u2014</span>',s=ue(t.status),i=t.prior_state||t.new_state?`<button class="uk-button kp-btn-ghost kp-btn-sm al-diff-btn"
                data-prior="${E(t.prior_state)}" data-new="${E(t.new_state)}">
               <span uk-icon="icon: git-fork; ratio: 0.85"></span>
           </button>`:"<span>\u2014</span>",r=t.details?`<button class="uk-button kp-btn-ghost kp-btn-sm al-diff-btn"
                data-prior="" data-new="${E(t.details)}">
               <span uk-icon="icon: info; ratio: 0.85"></span>
           </button>`:"<span>\u2014</span>";return`<tr>
        <td style="white-space:nowrap;font-size:0.82rem">${e}</td>
        <td>${a}</td>
        <td style="font-family:monospace;font-size:0.82rem">${E(t.ip)}</td>
        <td><span class="kp-badge">${E(t.method)}</span></td>
        <td style="font-family:monospace;font-size:0.82rem">${E(t.action)}</td>
        <td>${s}</td>
        <td>${r}</td>
        <td>${i}</td>
    </tr>`}function ft(t,e){let a=t>1?'<button class="uk-button kp-btn-ghost kp-btn-sm" id="al-prev">\u2039 Prev</button>':"",s=t<e?'<button class="uk-button kp-btn-ghost kp-btn-sm" id="al-next">Next \u203A</button>':"";return`<div class="uk-flex uk-flex-middle uk-flex-center uk-margin-small-top" style="gap:12px">
        ${a}
        <span style="font-size:0.85rem;color:var(--kp-text-dim)">Page ${t} of ${e}</span>
        ${s}
    </div>`}function ue(t){return`<span class="kp-badge ${t>=500?"kp-badge-error":t>=400?"kp-badge-warn":t>=300?"kp-badge-info":"kp-badge-ok"}">${t}</span>`}function E(t){return String(t??"").replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}async function yt(t,e){let a=new URLSearchParams({page:e,page_size:G});return t.username&&a.set("username",t.username),t.action&&a.set("action",t.action),t.target_type&&a.set("target_type",t.target_type),t.date_from&&a.set("date_from",t.date_from),t.date_to&&a.set("date_to",t.date_to),t.auth!==""&&a.set("auth",t.auth),u.get(`/audit?${a}`)}function me(t){return{username:t.querySelector("#al-filter-user").value.trim(),action:t.querySelector("#al-filter-action").value.trim(),target_type:t.querySelector("#al-filter-target").value.trim(),date_from:t.querySelector("#al-filter-date-from").value,date_to:t.querySelector("#al-filter-date-to").value,auth:t.querySelector("#al-filter-auth").value}}async function ke(t,e,a){async function s(r,o){let l=await yt(r,o);t.querySelector("#al-table-body").innerHTML=(l.entries??[]).map(ht).join("")||'<tr><td colspan="8" class="uk-text-center kp-text-dim">No records found</td></tr>';let p=Math.max(1,Math.ceil(l.total/G)),d=t.querySelector("#al-pager");d&&(d.innerHTML=p>1?ft(o,p):""),t.querySelector("#al-record-count").textContent=`${l.total} record${l.total!==1?"s":""}`,n(t,r,o,p),e=r,a=o}function n(r,o,l,p){r.querySelector("#al-prev")?.addEventListener("click",()=>s(o,l-1)),r.querySelector("#al-next")?.addEventListener("click",()=>s(o,l+1))}t.querySelector("#al-filter-apply")?.addEventListener("click",()=>{s(me(t),1)}),t.querySelector("#al-filter-clear")?.addEventListener("click",()=>{["al-filter-user","al-filter-action","al-filter-target","al-filter-date-from","al-filter-date-to"].forEach(r=>{let o=t.querySelector(`#${r}`);o&&(o.value="")}),t.querySelector("#al-filter-auth").value="",s({username:"",action:"",target_type:"",date_from:"",date_to:"",auth:""},1)});let i=Math.max(1,Math.ceil(parseInt(t.querySelector("#al-record-count")?.textContent??"0")/G));n(t,e,a,i),t.querySelector("#audit-log-panel")?.addEventListener("click",r=>{let o=r.target.closest(".al-diff-btn");if(!o)return;r.preventDefault(),r.stopPropagation();let l=o.dataset.prior??"",p=o.dataset.new??"",d="";l&&p?d=`=== BEFORE ===
`+K(l)+`

=== AFTER ===
`+K(p):p?d=K(p):d=K(l),document.body.insertAdjacentHTML("beforeend",`
            <div id="al-diff-modal-inst" uk-modal>
                <div class="uk-modal-dialog kp-modal uk-modal-body uk-width-large">
                    <button class="uk-modal-close-default" type="button" uk-close></button>
                    <h3 class="kp-view-title uk-margin-bottom">Request Detail</h3>
                    <pre class="kp-cron-output">${E(d)}</pre>
                </div>
            </div>`);let b=document.getElementById("al-diff-modal-inst");UIkit.modal(b).show(),b.addEventListener("hidden",()=>b.remove(),{once:!0})})}function K(t){try{return JSON.stringify(JSON.parse(t),null,2)}catch{return t}}async function wt(t){if(!_()){t.innerHTML=L("Access denied");return}let e={username:"",action:"",target_type:"",date_from:"",date_to:"",auth:""},a=await yt(e,1);t.innerHTML=pe(a,e,1),ke(t,e,1)}function Q(){document.body.insertAdjacentHTML("beforeend",`
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
        </div>`);let e=UIkit.modal("#kp-create-site-modal"),a=document.getElementById("cs-site-type"),s=document.getElementById("cs-php-version-wrap"),n=document.getElementById("cs-node-version-wrap"),i=document.getElementById("cs-dotnet-version-wrap"),r=document.getElementById("cs-start-command-wrap"),o=document.getElementById("cs-wordpress-wrap");e.show();let l=document.getElementById("cs-domains-wrap"),p=document.getElementById("cs-rp-note");a.addEventListener("change",()=>{let d=parseInt(a.value);s.classList.toggle("uk-hidden",d!==1&&d!==2||d===6),n.classList.toggle("uk-hidden",d!==4),i.classList.toggle("uk-hidden",d!==5),r.classList.toggle("uk-hidden",d!==4&&d!==5),o.classList.toggle("uk-hidden",d!==1||d===6),l.classList.toggle("uk-hidden",d===6),p.classList.toggle("uk-hidden",d!==6)}),document.getElementById("create-site-form").addEventListener("submit",async d=>{d.preventDefault();let b=d.target.querySelector('[type="submit"]'),k=b.innerHTML;b.disabled=!0,b.innerHTML='<div uk-spinner="ratio: 0.6"></div> Creating...';let m=new FormData(d.target),v=parseInt(m.get("site_type")),g=null;v===4&&(g=parseInt(m.get("node_version"))),v===5&&(g=parseInt(m.get("dotnet_version")));let f={name:m.get("name").trim(),php_version:parseInt(m.get("php_version"))||3,site_type:v,runtime_version:g,start_command:m.get("start_command")?.trim()||"",domains:m.get("domains").split(`
`).map(x=>x.trim()).filter(Boolean),install_wordpress:v===1?m.get("install_wordpress")==="on":!1};e.hide(),document.getElementById("kp-create-site-modal")?.remove();let w=v===6?`Setting up '${f.name}' as a reverse proxy...`:`Setting up '${f.name}' \u2014 pulling images and provisioning containers...`;S("Creating Site",w);try{await u.post("/sites",f),y(),c.success(`Site '${f.name}' created`),h.go("sites")}catch(x){y(),c.error(x.message),b.disabled=!1,b.innerHTML=k}}),document.getElementById("kp-create-site-modal").addEventListener("hidden",()=>document.getElementById("kp-create-site-modal")?.remove())}var A=null;function P(t){return t===0?"0 B":t<1024?`${t} B`:t<1048576?`${(t/1024).toFixed(1)} KB`:t<1073741824?`${(t/1048576).toFixed(1)} MB`:`${(t/1073741824).toFixed(2)} GB`}function be(t){return`${t.toFixed(1)}%`}var X=null;function rt(){return X||(X=new Promise(t=>{if(window.Chart){t();return}let e=document.createElement("script");e.src="https://cdn.jsdelivr.net/npm/chart.js@latest/dist/chart.umd.min.js",e.onload=t,e.onerror=t,document.body.appendChild(e)}),X)}function ct(t,e){return`
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

        </div>`}async function ve(t){await rt();let e;try{e=await u.get(`/sites/${t}/stats/traffic`)}catch(i){document.getElementById("stats-ip-rows").innerHTML=`<tr><td colspan="2" class="kp-muted uk-text-small">Failed to load: ${i.message}</td></tr>`;return}document.getElementById("stats-2xx").textContent=(e.status_codes["2xx"]??0).toLocaleString(),document.getElementById("stats-3xx").textContent=(e.status_codes["3xx"]??0).toLocaleString(),document.getElementById("stats-4xx").textContent=(e.status_codes["4xx"]??0).toLocaleString(),document.getElementById("stats-5xx").textContent=(e.status_codes["5xx"]??0).toLocaleString(),document.getElementById("stats-bandwidth").textContent=P(e.total_bandwidth??0);let a=document.getElementById("stats-chart");if(a&&window.Chart){let i=(e.hits_per_hour??[]).map(o=>new Date(o.hour).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}));A&&(A.destroy(),A=null),A=new window.Chart(a,{type:"bar",data:{labels:i,datasets:[{label:"2xx",data:(e.hits_per_hour??[]).map(o=>o["2xx"]),backgroundColor:"rgba(39,174,96,0.75)",borderColor:"rgba(39,174,96,1)",borderWidth:1,borderRadius:3},{label:"3xx",data:(e.hits_per_hour??[]).map(o=>o["3xx"]),backgroundColor:"rgba(43,142,255,0.75)",borderColor:"rgba(43,142,255,1)",borderWidth:1,borderRadius:3},{label:"4xx",data:(e.hits_per_hour??[]).map(o=>o["4xx"]),backgroundColor:"rgba(255,171,0,0.75)",borderColor:"rgba(255,171,0,1)",borderWidth:1,borderRadius:3},{label:"5xx",data:(e.hits_per_hour??[]).map(o=>o["5xx"]),backgroundColor:"rgba(235,59,90,0.75)",borderColor:"rgba(235,59,90,1)",borderWidth:1,borderRadius:3}]},options:{responsive:!0,maintainAspectRatio:!1,onClick:(o,l)=>{if(!l||!l.length)return;let p=l[0].datasetIndex,d=A.data.datasets[p].label;if(d!=="4xx"&&d!=="5xx")return;let b=l[0].index,k=document.getElementById("stats-panel");if(!k||!k._hitsPerHour)return;let m=k._hitsPerHour[b]?.hour;m&&fe(t,m,d)},onHover:(o,l)=>{if(!l||!l.length){o.native.target.style.cursor="default";return}let p=A.data.datasets[l[0].datasetIndex].label;o.native.target.style.cursor=p==="4xx"||p==="5xx"?"pointer":"default"},plugins:{legend:{display:!0,labels:{color:"#6b8cae",font:{size:11}},onHover:o=>{o.native.target.style.cursor="pointer"},onLeave:o=>{o.native.target.style.cursor="default"}},tooltip:{mode:"index",backgroundColor:"#0c1530",borderColor:"#1a2a4a",borderWidth:1,titleColor:"#dde8f5",bodyColor:"#6b8cae"}},scales:{x:{stacked:!0,ticks:{color:"#6b8cae",font:{size:10},maxRotation:45},grid:{color:"rgba(26,42,74,0.6)"}},y:{stacked:!0,ticks:{color:"#6b8cae",font:{size:10}},grid:{color:"rgba(26,42,74,0.6)"},beginAtZero:!0}}}});let r=document.getElementById("stats-panel");r&&(r._hitsPerHour=e.hits_per_hour??[])}let s=document.getElementById("stats-ip-rows");s&&(s.innerHTML=(e.top_ips??[]).length===0?'<tr><td colspan="2" class="kp-muted uk-text-small">No data</td></tr>':(e.top_ips??[]).map(i=>`
                <tr>
                    <td class="kp-stats-table-cell-mono">${i.name}</td>
                    <td class="kp-stats-table-cell-count">${i.count.toLocaleString()}</td>
                </tr>`).join(""));let n=document.getElementById("stats-ua-rows");n&&(n.innerHTML=(e.top_uas??[]).length===0?'<tr><td colspan="2" class="kp-muted uk-text-small">No data</td></tr>':(e.top_uas??[]).map(i=>`
                <tr>
                    <td class="kp-stats-ua-cell" title="${i.name}">${i.name}</td>
                    <td class="kp-stats-table-cell-count">${i.count.toLocaleString()}</td>
                </tr>`).join(""))}async function xt(t){let e=document.getElementById("stats-disk-wrap");if(e){e.innerHTML='<div uk-spinner="ratio:0.8" style="color:var(--kp-blue)"></div>';try{let a=await u.get(`/sites/${t}/stats/disk`);e.innerHTML=`
            <div class="uk-grid-small uk-child-width-1-2" uk-grid>
                <div>
                    <div class="kp-stat-card" style="padding:16px">
                        <div class="kp-stat-value kp-stats-disk-val">${P(a.html_bytes??0)}</div>
                        <div class="kp-stat-label">Site Files</div>
                    </div>
                </div>
                <div>
                    <div class="kp-stat-card" style="padding:16px">
                        <div class="kp-stat-value kp-stats-disk-val">${P(a.db_bytes??0)}</div>
                        <div class="kp-stat-label">Database</div>
                    </div>
                </div>
            </div>`}catch(a){e.innerHTML=`<p class="kp-muted uk-text-small">Failed to load disk usage: ${a.message}</p>`}}}function ge(t){return!t||t.length===0?'<p class="kp-muted uk-text-small uk-margin-remove">No container data.</p>':`
        <table class="uk-table uk-table-small uk-table-divider uk-margin-remove">
            <thead><tr>
                <th style="color:var(--kp-text-dim);font-size:0.75rem">Container</th>
                <th style="color:var(--kp-text-dim);font-size:0.75rem">CPU</th>
                <th style="color:var(--kp-text-dim);font-size:0.75rem">Memory</th>
                <th style="color:var(--kp-text-dim);font-size:0.75rem">Mem %</th>
            </tr></thead>
            <tbody>${t.map(a=>{let s=a.mem_limit>0?(a.mem_used/a.mem_limit*100).toFixed(1):0,n=s>80,i=a.name.split("-").pop();return`
            <tr>
                <td class="kp-stats-pod-role kp-stats-pod-role-btn"
                    data-container="${a.name}"
                    title="Restart ${i}"
                    style="cursor:pointer">${i}</td>
                <td class="kp-stats-pod-cpu${a.cpu_percent>80?" is-hot":""}">
                    ${be(a.cpu_percent)}
                </td>
                <td class="kp-stats-pod-mem">
                    ${P(a.mem_used)}
                    <span class="kp-stats-pod-mem-limit"> / ${P(a.mem_limit)}</span>
                </td>
                <td>
                    <div class="kp-stats-mem-wrap">
                        <div class="kp-stats-mem-bar-track">
                            <div class="kp-stats-mem-bar-fill${n?" is-hot":""}"
                                style="width:${s}%"></div>
                        </div>
                        <span class="kp-stats-mem-pct">${s}%</span>
                    </div>
                </td>
            </tr>`}).join("")}</tbody>
        </table>`}function he(t,e,a,s){if(!t||t.length===0)return'<p class="kp-muted uk-text-small">No matching requests found.</p>';let n=[...t].sort((d,b)=>{let k,m;switch(a){case"time":k=d.time,m=b.time;break;case"method":k=d.method,m=b.method;break;case"ip":k=d.client_ip,m=b.client_ip;break;default:k=d.status,m=b.status;break}return k<m?s?1:-1:k>m?s?-1:1:0}),i=50,r=Math.ceil(n.length/i),l=n.slice(e*i,(e+1)*i).map(d=>{let b=d.ua,k=d.status>=500?"kp-badge-danger":"kp-badge-warning";return`
            <tr>
                <td class="kp-stats-table-cell-mono" style="white-space:nowrap">${d.time.slice(11,19)}</td>
                <td class="kp-stats-table-cell-mono">${d.method}</td>
                <td style="word-break:break-all;font-size:0.8rem">${d.path}</td>
                <td><span class="kp-badge ${k}">${d.status}</span></td>
                <td class="kp-stats-table-cell-mono">${d.client_ip}</td>
                <td class="kp-dd-ua-cell">${b}</td>
            </tr>`}).join(""),p=r>1?`
        <div class="uk-flex uk-flex-between uk-flex-middle uk-margin-small-top">
            <span class="kp-muted uk-text-small">Page ${e+1} of ${r} \u2014 ${t.length} total</span>
            <div>
                ${e>0?`<button class="uk-button kp-btn-ghost kp-btn-sm" data-dd-page="${e-1}">\u2039 Prev</button>`:""}
                ${e<r-1?`<button class="uk-button kp-btn-ghost kp-btn-sm" data-dd-page="${e+1}">Next \u203A</button>`:""}
            </div>
        </div>`:"";return`
        <div class="kp-table-wrap">
            <table class="uk-table uk-table-small uk-table-divider uk-margin-remove">
                <thead><tr>
                    <th style="color:var(--kp-text-dim);font-size:0.75rem;cursor:pointer;user-select:none" data-dd-col="time">Time ${a==="time"?s?"\u2193":"\u2191":"\u2195"}</th>
                    <th style="color:var(--kp-text-dim);font-size:0.75rem;cursor:pointer;user-select:none" data-dd-col="method">Method ${a==="method"?s?"\u2193":"\u2191":"\u2195"}</th>
                    <th style="color:var(--kp-text-dim);font-size:0.75rem">Path</th>
                    <th style="color:var(--kp-text-dim);font-size:0.75rem;cursor:pointer;user-select:none" data-dd-col="status">Status ${a==="status"?s?"\u2193":"\u2191":"\u2195"}</th>
                    <th style="color:var(--kp-text-dim);font-size:0.75rem;cursor:pointer;user-select:none" data-dd-col="ip">IP ${a==="ip"?s?"\u2193":"\u2191":"\u2195"}</th>
                    <th style="color:var(--kp-text-dim);font-size:0.75rem">UA</th>
                </tr></thead>
                <tbody>${l}</tbody>
            </table>
        </div>
        ${p}`}async function fe(t,e,a){let s=document.getElementById("stats-drilldown-modal"),n=document.getElementById("stats-drilldown-title"),i=document.getElementById("stats-drilldown-body");if(!s||!i)return;n.textContent=`${a} Requests \u2014 ${new Date(e).toLocaleString([],{hour:"2-digit",minute:"2-digit",month:"short",day:"numeric"})}`,i.innerHTML='<div uk-spinner="ratio:0.8" style="color:var(--kp-blue)"></div>',UIkit.modal(s).show();let r=[],o=0,l="time",p=!0;function d(){i.innerHTML=he(r,o,l,p),i.querySelectorAll("th[data-dd-col]").forEach(b=>{b.addEventListener("click",()=>{let k=b.dataset.ddCol;l===k?p=!p:(l=k,p=!0),o=0,d()})}),i.querySelectorAll("[data-dd-page]").forEach(b=>{b.addEventListener("click",()=>{o=parseInt(b.dataset.ddPage,10),d()})})}try{r=await u.get(`/sites/${t}/stats/drilldown?hour=${encodeURIComponent(e)}&status=${a}`)}catch(b){i.innerHTML=`<p class="kp-muted uk-text-small">Failed to load: ${b.message}</p>`;return}d()}function St(t,e,a){let s=a===6,n=null;function i(){if(s)return;let l=t.querySelector("#stats-pod-indicator"),p=t.querySelector("#stats-pod-table-wrap");if(!p)return;let d=location.protocol==="https:"?"wss":"ws";n=new WebSocket(`${d}://${location.host}/api/sites/${e}/stats/pod`),n.onopen=()=>{l&&(l.className="kp-status kp-status-running",l.textContent="Live")},n.onmessage=b=>{try{let k=JSON.parse(b.data);p.innerHTML=ge(k.containers??[]),p.querySelectorAll(".kp-stats-pod-role-btn").forEach(m=>{m.addEventListener("click",async()=>{let v=m.style.color;m.style.color="var(--kp-warning)";let g=m.dataset.container.split("-").pop();try{await u.post(`/sites/${e}/containers/${g}/restart`),c.success(`${g} restarted`)}catch(f){m.style.color=v,c.error(f.message)}})})}catch{}},n.onerror=()=>{l&&(l.className="kp-status kp-status-error",l.textContent="Error")},n.onclose=()=>{l&&l.textContent==="Live"&&(l.className="kp-status kp-status-stopped",l.textContent="Disconnected")}}function r(){n&&n.readyState===WebSocket.OPEN&&n.close(),n=null}t.querySelector("#stats-disk-refresh")?.addEventListener("click",()=>{xt(e)}),i();let o=new MutationObserver(()=>{document.getElementById("stats-panel")||(r(),o.disconnect())});o.observe(document.getElementById("main")??document.body,{childList:!0,subtree:!1})}async function $t(t,e){let a=e===6;await ve(t),a||await xt(t)}async function Et(t){let e=await u.get("/sites")??[];t.innerHTML=`
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
                <button class="uk-button kp-btn-secondary kp-btn-sm uk-visible@s" id="bulk-start" disabled>
                    <span uk-icon="play"></span> Start
                </button>
                <button class="uk-button kp-btn-secondary kp-btn-sm uk-visible@s" id="bulk-stop" disabled>
                    <span uk-icon="ban"></span> Stop
                </button>
                <button class="uk-button kp-btn-secondary kp-btn-sm uk-visible@s" id="bulk-restart" disabled>
                    <span uk-icon="refresh"></span> Restart
                </button>
                <button class="uk-button kp-btn-secondary kp-btn-sm uk-visible@s" id="bulk-flush" disabled>
                    <span uk-icon="bolt"></span> Flush Caches
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
                    </div>
                </li>
            </div>
            <input class="uk-input kp-input kp-input-sm kp-sites-search"
                   id="sites-search" type="text" placeholder="Filter sites\u2026" autocomplete="off">
        </div>

        ${e.length===0?z("world","No sites yet \u2014 create one to get started"):`<div class="kp-table-wrap">
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
                            ${e.map(a=>ye(a,e)).join("")}
                        </tbody>
                    </table>
                </div>
            </div>`}`,document.getElementById("sites-new-btn").addEventListener("click",()=>Q()),we()}function ye(t,e=[]){let a=t.Domains?.[0]??null,s=t.SiteType===6,n=t.ParentID>0?e.find(i=>i.ID===t.ParentID)??null:null;return`
        <tr data-site-id="${t.ID}" data-status="${t.SiteStatus}" data-type="${t.SiteType}">
            <!-- row checkbox -->
            <td class="uk-table-shrink">
                <input class="uk-checkbox kp-site-row-check" type="checkbox"
                       data-site-id="${t.ID}" data-site-type="${t.SiteType}">
            </td>
            <!-- status badge -->
            <td class="uk-table-shrink kp-site-row-status">${s?"":B(t.SiteStatus)}</td>

            <!-- name + optional parent clone link -->
            <td>
                <a class="kp-site-row-name" href="javascript:void(0)"
                   data-action="manage" data-id="${t.ID}">${t.Name}</a>
                ${n?`<div class="kp-muted uk-text-small kp-mono">
                           <span uk-icon="icon: git-fork; ratio: 0.7"></span>
                           <a href="javascript:void(0)" data-action="manage" data-id="${n.ID}"
                              style="color:var(--kp-cyan)">${n.Name}</a>
                       </div>`:""}
            </td>

            <!-- type / runtime version -->
            <td class="uk-visible@s kp-muted kp-mono uk-text-small">
                ${H(t.SiteType)}${q(t)?" / "+q(t):""}
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
                    <button class="uk-button kp-btn-ghost kp-btn-sm"
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
                    <button class="uk-button kp-btn-ghost kp-btn-sm"
                            data-action="delete" data-id="${t.ID}"
                            uk-tooltip="Delete">
                        <span uk-icon="icon: trash;"></span>
                    </button>
                </div>
            </td>
        </tr>`}function Lt(t,e=[]){let a=t.Domains?.[0]??null,s=t.SiteType===6,n=t.ParentID>0?e.find(i=>i.ID===t.ParentID)??null:null;return`
        <div class="kp-site-card" data-site-id="${t.ID}" data-status="${t.SiteStatus}" data-type="${t.SiteType}">
            <div class="kp-site-card-header">
                <div>
                    <h2 class="kp-view-title" data-action="manage" data-id="${t.ID}">${t.Name}</h2>
                    <div class="kp-site-meta">
                        <span class="kp-site-meta-item"><span uk-icon="icon: server; ratio: 0.75"></span> :${t.Port}</span>
                        <span class="kp-site-meta-item"><span uk-icon="icon: code; ratio: 0.75"></span> ${H(t.SiteType)}${q(t)?" / "+q(t):""}</span>
                        ${a?`<span class="kp-site-meta-item" style="width:100%"><a href="http://${a}" target="_blank" style="color:var(--kp-cyan)">${a}</a></span>`:""}
                    </div>
                    ${n?`<div class="kp-site-meta kp-muted uk-text-small uk-margin-small-top"><span uk-icon="icon: git-fork; ratio: 0.75"></span> <a href="javascript:void(0)" data-action="manage" data-id="${n.ID}" style="color:var(--kp-cyan)">${n.Name}</a></div>`:""}
                </div>
                ${s?"":B(t.SiteStatus)}
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
        </div>`}function we(){let t=document.getElementById("sites-bulk-bar"),e=document.getElementById("sites-bulk-count"),a=document.getElementById("sites-select-all"),s=document.getElementById("sites-search"),n=document.querySelector(".kp-table-wrap tbody");if(!t||!a)return;let i=null,r=!0,o=()=>[...document.querySelectorAll(".kp-site-row-check:checked")],l=()=>{let v=o().length;e.textContent=`${v} selected`,["bulk-start","bulk-stop","bulk-restart","bulk-flush"].forEach(w=>{let x=document.getElementById(w);x&&(x.disabled=v===0)});let g=document.getElementById("kp-bulk-mobile-btn");g&&(g.disabled=v===0);let f=document.querySelectorAll(".kp-site-row-check");a.indeterminate=v>0&&v<f.length,a.checked=f.length>0&&v===f.length},p=()=>{let m=s.value.trim().toLowerCase();document.querySelectorAll(".kp-table-wrap tbody tr").forEach(v=>{let g=v.querySelector(".kp-site-row-name")?.textContent.toLowerCase()??"",f=v.querySelector("td:nth-child(6)")?.textContent.toLowerCase()??"";v.style.display=!m||g.includes(m)||f.includes(m)?"":"none"})},d=m=>{i===m?r=!r:(i=m,r=!0),document.querySelectorAll(".kp-sort-icon").forEach(g=>{g.textContent=g.dataset.col===m?r?" \u2191":" \u2193":" \u2195"});let v=[...n.querySelectorAll("tr")];v.sort((g,f)=>{let w="",x="";return m==="name"?(w=g.querySelector(".kp-site-row-name")?.textContent??"",x=f.querySelector(".kp-site-row-name")?.textContent??""):m==="status"?(w=g.dataset.status??"",x=f.dataset.status??""):m==="type"?(w=g.dataset.type??"",x=f.dataset.type??""):m==="domain"&&(w=g.querySelector("td:nth-child(6)")?.textContent.trim()??"",x=f.querySelector("td:nth-child(6)")?.textContent.trim()??""),r?w.localeCompare(x):x.localeCompare(w)}),v.forEach(g=>n.appendChild(g))};a.addEventListener("change",()=>{document.querySelectorAll(".kp-site-row-check").forEach(m=>{m.checked=a.checked}),l()}),n?.addEventListener("change",m=>{m.target.classList.contains("kp-site-row-check")&&l()}),s?.addEventListener("input",p),document.querySelectorAll(".kp-sortable").forEach(m=>{m.addEventListener("click",()=>d(m.dataset.col))}),["bulk-start","bulk-stop","bulk-restart","bulk-flush"].forEach(m=>{let v=m.replace("bulk-","");document.getElementById(m)?.addEventListener("click",()=>{let g=o().map(f=>f.dataset.siteId);document.dispatchEvent(new CustomEvent("kp:bulk-action",{detail:{action:v,ids:g}}))})});let b=document.getElementById("kp-bulk-mobile-pill"),k=document.getElementById("kp-bulk-mobile-dropdown");document.getElementById("kp-bulk-mobile-btn")?.addEventListener("click",m=>{m.stopPropagation(),k.hidden=!k.hidden}),document.addEventListener("click",m=>{k&&!b?.contains(m.target)&&(k.hidden=!0)},{capture:!0}),["start","stop","restart","flush"].forEach(m=>{document.getElementById(`bulk-mobile-${m}`)?.addEventListener("click",v=>{v.preventDefault(),k.hidden=!0;let g=o().map(f=>f.dataset.siteId);document.dispatchEvent(new CustomEvent("kp:bulk-action",{detail:{action:m,ids:g}}))})}),document.querySelectorAll(".kp-sort-icon").forEach(m=>{m.textContent=" \u2195"}),l()}var Y=null;async function Tt(t){let[e,a,s]=await Promise.all([u.get("/sites").catch(()=>[]),u.get("/stats/traffic").catch(()=>null),u.get("/stats/pod").catch(()=>null)]),n=e.filter(o=>o.SiteStatus===1).length,i=e.filter(o=>o.SiteStatus===2).length,r=e.filter(o=>o.SiteStatus===4).length;if(t.innerHTML=`
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
                            <div class="kp-stat-value" style="color:var(--kp-success)">${n}</div>
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
                            <div class="kp-stat-value" style="color:var(--kp-text-dim)">${i}</div>
                            <div class="kp-stat-label">Stopped</div>
                        </div>
                        <span style="color:var(--kp-text-dim)" uk-icon="icon: ban; ratio: 1.75"></span>
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
                    ${P(a?.total_bandwidth??0)}
                </span>
            </div>
            <div style="position:relative;height:180px">
                <canvas id="dash-traffic-chart"></canvas>
            </div>
        </div>

        <!-- global pod aggregate + top sites -->
        <div class="uk-grid-small uk-child-width-1-1 uk-child-width-1-2@m uk-margin-medium-bottom" uk-grid>
            <div>
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
                                <div class="kp-stat-value">${P(s?.mem_used??0)}</div>
                                <div class="kp-stat-label">Memory Used</div>
                            </div>
                            <span class="kp-stat-icon" uk-icon="icon: server; ratio: 1.75"></span>
                        </div>
                    </div></div>
                </div>
            </div>
            <div>
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
                            ${(a?.top_sites??[]).length===0?'<tr><td colspan="2" class="kp-muted uk-text-small">No traffic data</td></tr>':(a?.top_sites??[]).map(o=>`
                                    <tr>
                                        <td class="kp-mono" style="font-size:0.8rem">${o.name}</td>
                                        <td style="text-align:right;color:var(--kp-cyan);
                                            font-family:'JetBrains Mono',monospace;font-size:0.8rem">
                                            ${o.count.toLocaleString()}
                                        </td>
                                    </tr>`).join("")}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        <div class="kp-view-header">
            <h2 class="kp-view-title" style="font-size:1.25rem">Recent Sites</h2>
        </div>
        <div class="kp-site-grid">
            ${e.length===0?z("world","No sites yet"):e.slice(-3).reverse().map(o=>Lt(o,e)).join("")}
        </div>`,a?.hits_per_hour?.length){await rt();let o=document.getElementById("dash-traffic-chart");o&&window.Chart&&(Y&&(Y.destroy(),Y=null),Y=new window.Chart(o,{type:"bar",data:{labels:a.hits_per_hour.map(l=>new Date(l.hour).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})),datasets:[{label:"2xx",data:a.hits_per_hour.map(l=>l["2xx"]),backgroundColor:"rgba(39,174,96,0.75)",borderColor:"rgba(39,174,96,1)",borderWidth:1,borderRadius:3},{label:"3xx",data:a.hits_per_hour.map(l=>l["3xx"]),backgroundColor:"rgba(43,142,255,0.75)",borderColor:"rgba(43,142,255,1)",borderWidth:1,borderRadius:3},{label:"4xx",data:a.hits_per_hour.map(l=>l["4xx"]),backgroundColor:"rgba(255,171,0,0.75)",borderColor:"rgba(255,171,0,1)",borderWidth:1,borderRadius:3},{label:"5xx",data:a.hits_per_hour.map(l=>l["5xx"]),backgroundColor:"rgba(235,59,90,0.75)",borderColor:"rgba(235,59,90,1)",borderWidth:1,borderRadius:3}]},options:{responsive:!0,maintainAspectRatio:!1,plugins:{legend:{display:!0,labels:{color:"#6b8cae",font:{size:11}},onHover:l=>{l.native.target.style.cursor="pointer"},onLeave:l=>{l.native.target.style.cursor="default"}},tooltip:{mode:"index",backgroundColor:"#0c1530",borderColor:"#1a2a4a",borderWidth:1,titleColor:"#dde8f5",bodyColor:"#6b8cae"}},scales:{x:{stacked:!0,ticks:{color:"#6b8cae",font:{size:10},maxRotation:45},grid:{color:"rgba(26,42,74,0.6)"}},y:{stacked:!0,ticks:{color:"#6b8cae",font:{size:10}},grid:{color:"rgba(26,42,74,0.6)"},beginAtZero:!0}}}}))}document.getElementById("dash-new-site")?.addEventListener("click",()=>Q())}function N(t=null){let e=t?`/sites/${t}/security/ip`:"/security/ip",a=t?`/sites/${t}/security/ua`:"/security/ua",s=t?`/sites/${t}/waf`:"/settings/waf";return`
        <div id="security-panel" data-ip-base="${e}" data-ua-base="${a}" data-waf-base="${s}" ${t?`data-site-id="${t}"`:""}>

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

        </div>`}async function C(t){let e=t.querySelector("#security-panel");if(!e)return;let a=e.dataset.ipBase,s=e.dataset.uaBase,n=e.dataset.wafBase;try{let i=[u.get(a),u.get(s)];e.dataset.siteId||i.push(u.get(n),u.get("/settings/trusted-proxies"),u.get("/security/bypass"));let[r,o,l,p,d]=await Promise.all(i);if(!t.querySelector("#sec-ip-whitelist"))return;if(t.querySelector("#sec-ip-whitelist").value=r.whitelist??"",t.querySelector("#sec-ip-blacklist").value=r.blacklist??"",t.querySelector("#sec-ua-whitelist").value=o.whitelist??"",t.querySelector("#sec-ua-blacklist").value=o.blacklist??"",l){let b=t.querySelector("#sec-waf-enabled"),k=t.querySelector("#sec-waf-audit"),m=t.querySelector("#sec-waf-mode"),v=t.querySelector("#sec-waf-paranoia"),g=t.querySelector("#sec-waf-exclusions");b&&(b.checked=!!l.Enabled),k&&(k.checked=!!l.AuditLog),m&&(m.value=String(l.Mode??0)),v&&(v.value=String(l.ParanoiaLevel??1)),g&&(g.value=l.Exclusions??"")}if(p){let b=t.querySelector("#sec-tp-cidrs");b&&(b.value=p.trusted_proxies_custom??"")}if(d){let b=t.querySelector("#sec-bypass-cidrs");b&&(b.value=d.bypass??"")}}catch(i){c.error("Failed to load security rules: "+i.message)}}function Z(t){let e=t.querySelector("#security-panel");if(!e)return;let a=e.dataset.ipBase,s=e.dataset.uaBase;t.querySelector("#sec-ip-save")?.addEventListener("click",async()=>{let n=t.querySelector("#sec-ip-save"),i=n.innerHTML;n.disabled=!0,n.innerHTML='<div uk-spinner="ratio: 0.5"></div>';try{await u.put(a,{whitelist:t.querySelector("#sec-ip-whitelist").value,blacklist:t.querySelector("#sec-ip-blacklist").value}),c.success("IP rules saved")}catch(r){c.error(r.message)}finally{n.disabled=!1,n.innerHTML=i}}),t.querySelector("#sec-ua-save")?.addEventListener("click",async()=>{let n=t.querySelector("#sec-ua-save"),i=n.innerHTML;n.disabled=!0,n.innerHTML='<div uk-spinner="ratio: 0.5"></div>';try{await u.put(s,{whitelist:t.querySelector("#sec-ua-whitelist").value,blacklist:t.querySelector("#sec-ua-blacklist").value}),c.success("UA rules saved")}catch(r){c.error(r.message)}finally{n.disabled=!1,n.innerHTML=i}}),t.querySelector("#sec-tp-save")?.addEventListener("click",async()=>{let n=t.querySelector("#sec-tp-save"),i=n.innerHTML;n.disabled=!0,n.innerHTML='<div uk-spinner="ratio: 0.5"></div>';try{await u.put("/settings/trusted-proxies",{trusted_proxies_custom:t.querySelector("#sec-tp-cidrs").value.trim()}),c.success("Trusted proxy ranges saved")}catch(r){c.error(r.message)}finally{n.disabled=!1,n.innerHTML=i}}),t.querySelector("#sec-bypass-save")?.addEventListener("click",async()=>{let n=t.querySelector("#sec-bypass-save"),i=n.innerHTML;n.disabled=!0,n.innerHTML='<div uk-spinner="ratio: 0.5"></div>';try{await u.put("/security/bypass",{bypass:t.querySelector("#sec-bypass-cidrs").value.trim()}),c.success("Bypass rules saved")}catch(r){c.error(r.message)}finally{n.disabled=!1,n.innerHTML=i}}),t.querySelector("#sec-tp-import")?.addEventListener("change",async n=>{let i=n.target.files[0];if(!i)return;let r=new FormData;r.append("file",i);try{let o=await fetch("/api/settings/trusted-proxies/import",{method:"POST",body:r}),l=o.status===204?null:await o.json().catch(()=>null);if(!o.ok)throw new Error(l?.error||`HTTP ${o.status}`);await C(t),c.success("Trusted proxies imported")}catch(o){c.error(o.message)}finally{n.target.value=""}}),t.querySelector("#sec-waf-save")?.addEventListener("click",async()=>{let n=t.querySelector("#sec-waf-save"),i=n.innerHTML;n.disabled=!0,n.innerHTML='<div uk-spinner="ratio: 0.5"></div>';try{await u.put(e.dataset.wafBase,{enabled:t.querySelector("#sec-waf-enabled").checked,mode:parseInt(t.querySelector("#sec-waf-mode").value,10),paranoia_level:parseInt(t.querySelector("#sec-waf-paranoia").value,10),audit_log:t.querySelector("#sec-waf-audit").checked,exclusions:t.querySelector("#sec-waf-exclusions").value.trim()}),c.success("WAF settings saved \u2014 engine recompiling in background")}catch(r){c.error(r.message)}finally{n.disabled=!1,n.innerHTML=i}}),t.querySelector("#sec-ip-import")?.addEventListener("change",async n=>{let i=n.target.files[0];if(!i)return;let r=new FormData;r.append("file",i);try{let o=await fetch("/api"+a+"/import",{method:"POST",body:r}),l=o.status===204?null:await o.json().catch(()=>null);if(!o.ok)throw new Error(l?.error||`HTTP ${o.status}`);await C(t),c.success("IP rules imported")}catch(o){c.error(o.message)}finally{n.target.value=""}}),t.querySelector("#sec-ua-import")?.addEventListener("change",async n=>{let i=n.target.files[0];if(!i)return;let r=new FormData;r.append("file",i);try{let o=await fetch("/api"+s+"/import",{method:"POST",body:r}),l=o.status===204?null:await o.json().catch(()=>null);if(!o.ok)throw new Error(l?.error||`HTTP ${o.status}`);await C(t),c.success("UA rules imported")}catch(o){c.error(o.message)}finally{n.target.value=""}}),t.querySelector("#sec-waf-import")?.addEventListener("change",async n=>{let i=n.target.files[0];if(!i)return;let r=new FormData;r.append("file",i);try{let o=await fetch("/api/settings/waf/import",{method:"POST",body:r}),l=o.status===204?null:await o.json().catch(()=>null);if(!o.ok)throw new Error(l?.error||`HTTP ${o.status}`);await C(t),c.success("WAF settings imported")}catch(o){c.error(o.message)}finally{n.target.value=""}})}async function _t(t){if(!_()){t.innerHTML=L("Access denied");return}t.innerHTML=`
        <div class="kp-view-header">
            <h1 class="kp-view-title kp-cursor" style="font-size:2rem;">Global Security</h1>
        </div>
        <p class="kp-muted uk-text-small uk-margin-bottom">
            Global rules apply to all sites before per-site rules are evaluated.
            Blacklist always wins \u2014 a blacklisted entry cannot be overridden by any whitelist.
        </p>
        ${N(null)}`,Z(t),C(t)}function xe(t){switch(t){case"valid":case"self-signed":return'<span class="kp-ssl-valid" uk-icon="icon: lock; ratio: 0.85" uk-tooltip="Valid SSL certificate"></span>';default:return'<span class="kp-ssl-none" uk-icon="icon: warning; ratio: 0.85" uk-tooltip="No SSL certificate"></span>'}}async function Pt(t){let e=document.getElementById("admin-domain-ssl");if(!(!e||!t))try{let a=await u.get(`/ssl-status?domain=${encodeURIComponent(t)}`);e.outerHTML=xe(a.status)}catch{}}async function Ct(t){if(!_()){t.innerHTML=L("Access denied");return}let[e,a,s,n,i,r]=await Promise.all([u.get("/settings"),u.get("/settings/backup"),u.get("/settings/waf"),u.get("/settings/trusted-proxies"),u.get("/settings/notifications"),u.get("/settings/resources")]);t.innerHTML=`
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
    `,e.admin_domain&&Pt(e.admin_domain),document.getElementById("settings-form").addEventListener("submit",async o=>{o.preventDefault();let l=o.target.querySelector('[type="submit"]'),p=l.innerHTML;l.disabled=!0,l.innerHTML='<div uk-spinner="ratio: 0.6"></div> Saving...';let b={admin_domain:new FormData(o.target).get("admin_domain").trim()};try{await u.put("/settings",b),c.success("Settings saved"),Pt(b.admin_domain)}catch(k){c.error(k.message)}finally{l.disabled=!1,l.innerHTML=p}}),document.getElementById("settings-import").addEventListener("change",async o=>{let l=o.target.files[0];if(!l)return;let p=new FormData;p.append("file",l);try{let d=await fetch("/api/settings/import",{method:"POST",body:p}),b=d.status===204?null:await d.json().catch(()=>null);if(!d.ok)throw new Error(b?.error||`HTTP ${d.status}`);c.success("Settings imported")}catch(d){c.error(d.message)}finally{o.target.value=""}}),document.getElementById("backup-form").addEventListener("submit",async o=>{o.preventDefault();let l=o.target.querySelector('[type="submit"]'),p=l.innerHTML;l.disabled=!0,l.innerHTML='<div uk-spinner="ratio: 0.6"></div> Saving...';let d=new FormData(o.target),b={backup_schedule:d.get("backup_schedule").trim(),backup_retain_days:d.get("backup_retain_days").trim()};try{await u.put("/settings/backup",b),c.success("Backup settings saved")}catch(k){c.error(k.message)}finally{l.disabled=!1,l.innerHTML=p}}),document.getElementById("s3-form").addEventListener("submit",async o=>{o.preventDefault();let l=o.target.querySelector('[type="submit"]'),p=l.innerHTML;l.disabled=!0,l.innerHTML='<div uk-spinner="ratio: 0.6"></div> Saving...';let d=new FormData(o.target),b={s3_endpoint:d.get("s3_endpoint").trim(),s3_bucket:d.get("s3_bucket").trim(),s3_region:d.get("s3_region").trim(),s3_access_key:d.get("s3_access_key").trim()},k=d.get("s3_secret_key").trim();k&&(b.s3_secret_key=k);try{await u.put("/settings/backup",b),c.success("S3 settings saved")}catch(m){c.error(m.message)}finally{l.disabled=!1,l.innerHTML=p}}),document.getElementById("smtp-form").addEventListener("submit",async o=>{o.preventDefault();let l=o.target.querySelector('[type="submit"]'),p=l.innerHTML;l.disabled=!0,l.innerHTML='<div uk-spinner="ratio: 0.6"></div> Saving...';let d=new FormData(o.target),b={smtp_host:d.get("smtp_host").trim(),smtp_port:d.get("smtp_port").trim(),smtp_username:d.get("smtp_username").trim(),smtp_from:d.get("smtp_from").trim(),smtp_tls:d.get("smtp_tls")?"true":"false"},k=d.get("smtp_password").trim();k&&(b.smtp_password=k);try{await u.put("/settings/notifications",b),c.success("Email notification settings saved")}catch(m){c.error(m.message)}finally{l.disabled=!1,l.innerHTML=p}}),document.getElementById("sns-form").addEventListener("submit",async o=>{o.preventDefault();let l=o.target.querySelector('[type="submit"]'),p=l.innerHTML;l.disabled=!0,l.innerHTML='<div uk-spinner="ratio: 0.6"></div> Saving...';let d=new FormData(o.target),b={aws_access_key:d.get("aws_access_key").trim(),aws_region:d.get("aws_region").trim(),aws_sns_sender_id:d.get("aws_sns_sender_id").trim()},k=d.get("aws_secret_key").trim();k&&(b.aws_secret_key=k);try{await u.put("/settings/notifications",b),c.success("SMS notification settings saved")}catch(m){c.error(m.message)}finally{l.disabled=!1,l.innerHTML=p}}),document.getElementById("resource-form").addEventListener("submit",async o=>{o.preventDefault();let l=o.target.querySelector('[type="submit"]'),p=l.innerHTML;l.disabled=!0,l.innerHTML='<div uk-spinner="ratio: 0.6"></div> Saving...';let d=new FormData(o.target),b={resource_ram_reserve_gb:d.get("resource_ram_reserve_gb").trim(),resource_poll_interval:d.get("resource_poll_interval").trim(),resource_throttle_pct:d.get("resource_throttle_pct").trim(),resource_webhook_url:d.get("resource_webhook_url").trim()};try{await u.put("/settings/resources",b),c.success("Resource watcher settings saved")}catch(k){c.error(k.message)}finally{l.disabled=!1,l.innerHTML=p}})}function Bt(t){return`
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

        </div>`}function Se(t){if(!t||t.length===0)return'<p class="kp-muted uk-text-small uk-margin-remove">No snapshots yet.</p>';let e=n=>n===2?'<span class="kp-mono" style="color:var(--kp-cyan)">S3</span>':'<span class="kp-mono" style="color:var(--kp-blue)">Local</span>',a=n=>n<1024?`${n} B`:n<1048576?`${(n/1024).toFixed(1)} KB`:n<1073741824?`${(n/1048576).toFixed(1)} MB`:`${(n/1073741824).toFixed(2)} GB`;return`
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
            <tbody>${t.map(n=>`
        <tr>
            <td class="kp-mono" style="font-size:0.8rem">${n.SnapshotID}</td>
            <td>${n.Label||"\u2014"}</td>
            <td>${e(n.BackupType)}</td>
            <td>${a(n.SizeBytes)}</td>
            <td>${new Date(n.Created).toLocaleString()}</td>
            <td>
                <div class="uk-flex" style="gap:6px">
                    <button class="uk-button kp-btn-ghost kp-btn-sm backup-download-btn"
                        data-id="${n.ID}" uk-tooltip="Download backup archive">
                        <span uk-icon="download"></span>
                    </button>
                    <button class="uk-button kp-btn-secondary kp-btn-sm backup-restore-btn"
                        data-id="${n.ID}" uk-tooltip="Restore from this snapshot">
                        <span uk-icon="history"></span>
                    </button>
                    <button class="uk-button kp-btn-danger kp-btn-sm backup-delete-btn"
                        data-id="${n.ID}" uk-tooltip="Delete this snapshot">
                        <span uk-icon="trash"></span>
                    </button>
                </div>
            </td>
        </tr>`).join("")}</tbody>
        </table>`}function It(t,e){let a=Date.now()+18e5,s=setInterval(async()=>{try{let n=await u.get(`/sites/${e}/backups/restore-status`);(!n?.active||Date.now()>a)&&(clearInterval(s),y(),n?.active?c.error("Import timed out \u2014 check server logs"):c.success("Import complete"),await R(t,e))}catch{}},3e3)}async function R(t,e){try{let[a,s]=await Promise.all([u.get(`/sites/${e}/backup-repo`),u.get(`/sites/${e}/backups`)]),n=t.querySelector("#backup-local-enabled"),i=t.querySelector("#backup-s3-enabled");n&&(n.checked=!!a.LocalEnabled),i&&(i.checked=!!a.S3Enabled);let r=t.querySelector("#backup-error-banner");if(r)if(a.last_error){let l=a.last_error_at?` (${new Date(a.last_error_at).toLocaleString()})`:"";r.innerHTML=`
                    <div uk-alert class="uk-alert-warning">
                        <a class="uk-alert-close" uk-close></a>
                        <p><strong>Last scheduled backup failed${l}:</strong> ${a.last_error}</p>
                    </div>`}else r.innerHTML="";let o=t.querySelector("#backup-list-wrap");o&&(o.innerHTML=Se(s))}catch(a){let s=t.querySelector("#backup-list-wrap");s&&(s.innerHTML=`<p class="kp-muted uk-text-small">Failed to load backups: ${a.message}</p>`)}}function qt(t,e){t.querySelector("#backup-repo-save")?.addEventListener("click",async()=>{let s={local_enabled:t.querySelector("#backup-local-enabled")?.checked??!1,s3_enabled:t.querySelector("#backup-s3-enabled")?.checked??!1};try{await u.put(`/sites/${e}/backup-repo`,s),c.success("Backup destinations saved")}catch(n){c.error(n.message)}}),t.querySelector("#backup-run-btn")?.addEventListener("click",async()=>{let s=0;try{s=(await u.get(`/sites/${e}/backups`))?.length??0}catch{}try{await u.post(`/sites/${e}/backups`,{label:"manual"})}catch(r){c.error(r.message);return}S("Backup Running","Snapshotting files and database \u2014 this may take a few minutes.");let n=Date.now()+1800*1e3,i=setInterval(async()=>{try{(((await u.get(`/sites/${e}/backups`))?.length??0)>s||Date.now()>n)&&(clearInterval(i),y(),await R(t,e),Date.now()<=n?c.success("Backup complete"):c.error("Backup is taking longer than expected \u2014 check server logs for status"))}catch{}},4e3)}),t.querySelector("#backup-list-wrap")?.addEventListener("click",async s=>{let n=s.target.closest(".backup-restore-btn");if(n){let o=n.dataset.id;if(!await $("Restore Site","This will restore the site from the selected snapshot. The site will show a maintenance page during the restore. Continue?"))return;try{await u.post(`/sites/${e}/backups/${o}/restore`)}catch(k){c.error(k.message);return}S("Restore Running","Restoring files and database \u2014 the site will return automatically when complete.");let p=Date.now(),d=Date.now()+900*1e3,b=setInterval(async()=>{try{let k=await u.get(`/sites/${e}/backups/restore-status`);(!k?.active||Date.now()>d)&&(clearInterval(b),y(),k?.active?c.error("Restore timed out"):c.success("Restore complete"),await R(t,e))}catch{}},3e3);return}let i=s.target.closest(".backup-delete-btn");if(i){let o=i.dataset.id;if(!await $("Delete Snapshot","This will permanently remove the snapshot from all configured repositories. This cannot be undone."))return;S("Deleting Snapshot","Removing snapshot data from repositories \u2014 this may take a moment.");try{await u.delete(`/sites/${e}/backups/${o}`),y(),c.success("Snapshot deleted"),await R(t,e)}catch(p){y(),c.error(p.message)}}let r=s.target.closest(".backup-download-btn");if(r){let o=r.dataset.id;S("Preparing Download","Your backup archive is being generated \u2014 this may take a moment depending on site size. Your download will begin automatically. Do not close this tab."),setTimeout(()=>{let l=document.createElement("a");l.href=`/api/sites/${e}/backups/${o}/download`,l.style.display="none",document.body.appendChild(l),l.click(),document.body.removeChild(l),setTimeout(()=>{y()},5e3)},300);return}});let a=t.querySelector("#import-backup-modal");a&&(UIkit.util.on(a,"beforeshow",async()=>{let s=a.querySelector("#import-target-site");try{let i=await u.get("/sites");s.innerHTML=i.map(r=>`<option value="${r.ID}"${r.ID===e?" selected":""}>${r.Name}</option>`).join("")}catch{s.innerHTML='<option value="">Failed to load sites</option>'}let n=a.querySelector("#import-sftp-list");try{let i=await u.get(`/sites/${e}/backups/import/files`);!i||i.length===0?n.innerHTML='<p class="kp-muted uk-text-small">No files found.</p>':n.innerHTML=i.map(r=>`
                    <div class="uk-flex uk-flex-middle uk-flex-between uk-margin-small-bottom">
                        <span class="kp-mono uk-text-small">${r}</span>
                        <button class="uk-button kp-btn-primary kp-btn-sm import-sftp-btn" data-file="${r}">
                            Restore
                        </button>
                    </div>`).join("")}catch(i){n.innerHTML=`<p class="kp-muted uk-text-small">Failed to list files: ${i.message}</p>`}}),a.querySelector("#import-upload-btn")?.addEventListener("click",async()=>{let s=a.querySelector("#import-file-input"),n=a.querySelector("#import-target-site")?.value;if(!s?.files?.length){c.error("Select an archive file first");return}let i=s.files[0],r=new FormData;r.append("archive",i),r.append("target_site_id",n),UIkit.modal(a).hide(),S("Importing Backup","Uploading and restoring \u2014 this may take several minutes.");try{await fetch(`/api/sites/${e}/backups/import/upload`,{method:"POST",body:r,credentials:"same-origin"}).then(async o=>{if(!o.ok){let l=await o.json().catch(()=>({}));throw new Error(l.error||`HTTP ${o.status}`)}})}catch(o){y(),c.error(o.message);return}It(t,e)}),a.querySelector("#import-sftp-list")?.addEventListener("click",async s=>{let n=s.target.closest(".import-sftp-btn");if(!n)return;let i=n.dataset.file,r=a.querySelector("#import-target-site")?.value;UIkit.modal(a).hide(),S("Importing from SFTP","Restoring archive \u2014 this may take several minutes.");try{await u.post(`/sites/${e}/backups/import/sftp`,{filename:i,target_site_id:parseInt(r,10)})}catch(o){y(),c.error(o.message);return}It(t,e)}))}function dt(){return`
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
        </div>`}async function tt(t){let e=document.getElementById("basicauth-panel");if(e)try{let[a,s]=await Promise.all([u.get(`/sites/${t}/basicauth`),u.get(`/sites/${t}/basicauth/users`)]),n=e.querySelector("#ba-enabled"),i=e.querySelector("#ba-realm");n&&(n.checked=!!a.Enabled),i&&(i.value=a.Realm??"Restricted"),$e(e,s??[])}catch(a){c.error("Failed to load basic auth settings: "+a.message)}}function $e(t,e){let a=t.querySelector("#ba-users-list");if(a){if(!e.length){a.innerHTML='<p class="kp-muted uk-text-small">No credentials configured.</p>';return}a.innerHTML=e.map(s=>`
        <div class="uk-flex uk-flex-middle uk-margin-small-bottom ba-user-row" data-uid="${s.id}" style="gap:8px">
            <span class="kp-mono" style="flex:1">${s.username}</span>
            <a href="javascript:void(0);" class="kp-muted ba-delete-btn" uk-icon="trash" uk-tooltip="Remove credential"></a>
        </div>`).join("")}}function Mt(t,e){let a=new AbortController,s={signal:a.signal};t.addEventListener("click",async n=>{if(!n.target.closest("#ba-config-save"))return;let i=t.querySelector("#ba-config-save"),r=i.innerHTML;i.disabled=!0,i.innerHTML='<div uk-spinner="ratio: 0.5"></div>';try{await u.put(`/sites/${e}/basicauth`,{enabled:t.querySelector("#ba-enabled").checked,realm:t.querySelector("#ba-realm").value.trim()||"Restricted"}),c.success("Basic auth settings saved")}catch(o){c.error(o.message)}finally{i.disabled=!1,i.innerHTML=r}},s),t.addEventListener("click",async n=>{if(!n.target.closest("#ba-add-user"))return;let i=t.querySelector("#ba-new-username").value.trim(),r=t.querySelector("#ba-new-password").value;if(!i||!r){c.error("Username and password are required");return}let o=t.querySelector("#ba-add-user"),l=o.innerHTML;o.disabled=!0,o.innerHTML='<div uk-spinner="ratio: 0.5"></div>';try{await u.put(`/sites/${e}/basicauth/users`,{username:i,password:r}),c.success(`Credential saved for ${i}`),t.querySelector("#ba-new-username").value="",t.querySelector("#ba-new-password").value="",await tt(e)}catch(p){c.error(p.message)}finally{o.disabled=!1,o.innerHTML=l}},s),t.addEventListener("click",async n=>{let i=n.target.closest(".ba-delete-btn");if(!i)return;let r=i.closest(".ba-user-row")?.dataset.uid;if(r)try{await u.delete(`/sites/${e}/basicauth/users/${r}`),c.success("Credential removed"),await tt(e)}catch(o){c.error(o.message)}},s),t.__basicAuthAbort?.abort(),t.__basicAuthAbort=a}var F={1:"Nginx",2:"PHP",3:"MariaDB",4:"Redis",5:"Varnish"};function W(t,e,a){let s=a?Object.entries(a):[];return`
        <div>
            <div class="uk-flex uk-flex-between uk-flex-middle uk-margin-small-bottom">
                <div class="uk-flex uk-flex-middle" style="gap:10px">
                    <h4 class="kp-view-title uk-margin-remove">${F[e]}</h4>
                    <span class="kp-muted uk-text-small">${s.length} keys</span>
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
                ${s.map(([n,i])=>U(n,i)).join("")}
            </div>
        </div>`}function Dt(t,e){let a=e?.enabled==="true",s=e?Object.entries(e).filter(([n])=>n!=="enabled"):[];return`
        <div>
            <div class="uk-flex uk-flex-between uk-flex-middle uk-margin-small-bottom" uk-tooltip="Add a Key">
                <div class="uk-flex uk-flex-middle" style="gap:10px">
                    <h4 class="kp-view-title uk-margin-remove">Varnish</h4>
                    <span class="kp-muted uk-text-small">${s.length} keys</span>
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
                ${s.map(([n,i])=>U(n,i)).join("")}
            </div>
        </div>`}function U(t="",e=""){return`<div class="kp-config-row">
        <div class="kp-config-key">
            <input class="cfg-key" type="text" value="${t}" placeholder="key">
        </div>
        <div class="kp-config-val">
            <input class="cfg-val" type="text" value="${e}" placeholder="value">
        </div>
        <button class="kp-config-del cfg-del-row" title="Remove">
            <span uk-icon="icon: close; ratio: 0.8"></span>
        </button>
    </div>`}function At(t,e){t.addEventListener("click",a=>{if(a.target.closest(".cfg-add-row")){let s=a.target.closest(".cfg-add-row");t.querySelector(`.cfg-rows[data-type="${s.dataset.type}"]`).insertAdjacentHTML("beforeend",U())}}),t.addEventListener("click",a=>{a.target.closest(".cfg-del-row")&&a.target.closest(".kp-config-row").remove()}),t.addEventListener("click",async a=>{let s=a.target.closest(".cfg-save");if(!s)return;let{type:n,site:i}=s.dataset,r=t.querySelectorAll(`.cfg-rows[data-type="${n}"] .kp-config-row`),o={};if(r.forEach(l=>{let p=l.querySelector(".cfg-key").value.trim(),d=l.querySelector(".cfg-val").value.trim();p&&(o[p]=d)}),n==="5"){let l=t.querySelector(".varnish-enabled-toggle");o.enabled=l?.checked?"true":"false"}try{await u.put(`/sites/${i}/configs/${n}`,o),c.success(`${F[n]} config saved`)}catch(l){c.error(l.message)}}),t.addEventListener("click",async a=>{let s=a.target.closest(".cfg-reset");if(!s)return;let{type:n,site:i}=s.dataset;if(await $("Reset Config",`Reset ${F[n]} config to defaults?`))try{let o=await u.post(`/sites/${i}/configs/${n}/reset`),l=t.querySelector(`.cfg-rows[data-type="${n}"]`);l.innerHTML=Object.entries(o).map(([p,d])=>U(p,d)).join(""),c.success(`${F[n]} reset to defaults`)}catch(o){c.error(o.message)}}),t.addEventListener("change",async a=>{let s=a.target.closest(".cfg-import-input");if(!s)return;let{type:n,site:i}=s.dataset,r=s.files[0];if(!r)return;let o=new FormData;o.append("file",r);try{let l=await fetch(`/api/sites/${i}/configs/${n}/import`,{method:"POST",body:o}),p=l.status===204?null:await l.json().catch(()=>null);if(!l.ok)throw new Error(p?.error||`HTTP ${l.status}`);let d=t.querySelector(`.cfg-rows[data-type="${n}"]`);d.innerHTML=Object.entries(p).map(([b,k])=>U(b,k)).join(""),c.success(`${F[n]} config imported`)}catch(l){c.error(l.message)}finally{s.value=""}})}function Ht(t){return`
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

        </div>`}function Nt(t){if(!t||t.length===0)return'<p class="kp-muted uk-text-small uk-margin-remove">No cron jobs configured.</p>';let e=s=>s?new Date(s).toLocaleString():"\u2014";return`
        <table class="uk-table uk-table-small uk-table-divider uk-margin-remove">
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
        </table>`}async function et(t,e){let a=t.querySelector("#cron-list-wrap");if(a)try{let s=await u.get(`/sites/${e}/crons`);a.innerHTML=Nt(s)}catch(s){a.innerHTML=`<p class="kp-muted uk-text-small">Failed to load cron jobs: ${s.message}</p>`}}function Ft(t,e){let a=[],s=t.querySelector("#cron-modal"),n=t.querySelector("#cron-modal-title"),i=t.querySelector("#cron-modal-id"),r=t.querySelector("#cron-modal-label"),o=t.querySelector("#cron-modal-command"),l=t.querySelector("#cron-modal-schedule"),p=t.querySelector("#cron-schedule-preview"),d=t.querySelector("#cron-modal-enabled");l?.addEventListener("input",()=>{p.textContent=Rt(l.value.trim())}),t.querySelector("#cron-add-btn")?.addEventListener("click",()=>{n.textContent="Add Cron Job",i.value="",r.value="",o.value="",l.value="",p.textContent="",d.checked=!0,UIkit.modal(s).show()}),t.querySelector("#cron-modal-save")?.addEventListener("click",async()=>{let b=o.value.trim(),k=l.value.trim();if(!b||!k){c.error("Command and schedule are required");return}let m={label:r.value.trim(),command:b,schedule:k,enabled:d.checked},v=i.value;try{v?(await u.put(`/sites/${e}/crons/${v}`,m),c.success("Cron job updated")):(await u.post(`/sites/${e}/crons`,m),c.success("Cron job created")),UIkit.modal(s).hide(),await et(t,e),a=await u.get(`/sites/${e}/crons`)}catch(g){c.error(g.message)}}),t.querySelector("#cron-list-wrap")?.addEventListener("click",async b=>{let k=b.target.closest(".cron-detail-btn");if(k){let f=k.dataset.id,w=a.find(it=>String(it.ID)===f);if(!w)return;document.body.insertAdjacentHTML("beforeend",`
                <div id="cron-detail-modal" uk-modal>
                    <div class="uk-modal-dialog kp-modal uk-modal-body uk-width-large">
                        <button class="uk-modal-close-default" type="button" uk-close></button>
                        <h3 class="kp-view-title uk-margin-bottom">Run Details \u2014 ${pt(w.Label||String(w.ID))}</h3>
                        <div class="uk-margin-small-bottom">
                            <label class="kp-label">Output</label>
                            <pre class="kp-cron-output">${pt(w.LastOutput||"(no output)")}</pre>
                        </div>
                        <div class="uk-margin-small-top">
                            <label class="kp-label">Error</label>
                            <pre class="kp-cron-output kp-cron-output-error">${pt(w.LastError||"(no error)")}</pre>
                        </div>
                    </div>
                </div>`);let x=document.getElementById("cron-detail-modal");UIkit.modal(x).show(),x.addEventListener("hidden",()=>x.remove(),{once:!0});return}let m=b.target.closest(".cron-edit-btn");if(m){let f=m.dataset.id,w=a.find(x=>String(x.ID)===f);if(!w)return;n.textContent="Edit Cron Job",i.value=w.ID,r.value=w.Label||"",o.value=w.Command,l.value=w.Schedule,p.textContent=Rt(w.Schedule),d.checked=w.Enabled,UIkit.modal(s).show();return}let v=b.target.closest(".cron-delete-btn");if(v){let f=v.dataset.id;if(!await $("Delete Cron Job","This will permanently remove the cron job. Continue?"))return;try{await u.delete(`/sites/${e}/crons/${f}`),c.success("Cron job deleted"),await et(t,e),a=await u.get(`/sites/${e}/crons`)}catch(x){c.error(x.message)}return}let g=b.target.closest(".cron-run-btn");if(g){let f=g.dataset.id;try{await u.post(`/sites/${e}/crons/${f}/run`)}catch(T){c.error(T.message);return}S("Running Cron Job","Executing the job inside the container \u2014 please wait.");let w=null;try{w=(await u.get(`/sites/${e}/crons`)).find(M=>String(M.ID)===f)?.LastRun??null}catch{}let x=Date.now()+300*1e3,it=setInterval(async()=>{try{let T=await u.get(`/sites/${e}/crons`),M=T.find(O=>String(O.ID)===f);if(!M||M.LastRun!==w||Date.now()>x){clearInterval(it),y(),a=T??[];let O=t.querySelector("#cron-list-wrap");O&&(O.innerHTML=Nt(T)),M?.LastError?c.error(`Job failed: ${M.LastError}`):c.success("Cron job complete")}}catch{}},2e3);return}}),t.querySelector("#cron-list-wrap")?.addEventListener("change",async b=>{let k=b.target.closest(".cron-toggle");if(!k)return;let m=k.dataset.id;try{await u.patch(`/sites/${e}/crons/${m}/toggle`,{enabled:k.checked}),c.success(k.checked?"Cron job enabled":"Cron job disabled")}catch(v){c.error(v.message),k.checked=!k.checked}}),u.get(`/sites/${e}/crons`).then(b=>{a=b??[]}).catch(()=>{})}function pt(t){return String(t).replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}function Rt(t){if(!t)return"";let e=t.trim().split(/\s+/);if(e.length!==5)return"invalid expression";let[a,s,n,i,r]=e;if(t==="* * * * *")return"every minute";if(a!=="*"&&s!=="*"&&n==="*"&&i==="*"&&r==="*")return`daily at ${s.padStart(2,"0")}:${a.padStart(2,"0")}`;if(a!=="*"&&s!=="*"&&n==="*"&&i==="*"&&r!=="*"){let o=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];return`weekly on ${r.split(",").map(p=>o[parseInt(p)]??p).join(", ")} at ${s.padStart(2,"0")}:${a.padStart(2,"0")}`}return a.startsWith("*/")?`every ${a.slice(2)} minutes`:s.startsWith("*/")?`every ${s.slice(2)} hours`:t}var Ee=2e3;function ut(t,e){return`
        <div>
            <div class="kp-log-controls">
                <select class="uk-select kp-select" id="log-container" style="width:140px;height:38px">
                    ${e===6?'<option value="proxy">Proxy Log</option><option value="waf">WAF Log</option>':`<option value="access">Access</option>
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
        </div>`}function Ut(t,e){let a=null,s=!1,n=t.querySelector("#log-output"),i=t.querySelector("#log-connect"),r=t.querySelector("#log-disconnect"),o=t.querySelector("#log-clear"),l=t.querySelector("#log-autoscroll"),p=t.querySelector("#log-status");function d(m){for(m.split(`
`).forEach(v=>{if(!v)return;let g=document.createElement("div");g.className=v.match(/WAF BLOCK/i)?"kp-log-line-err":v.match(/WAF DETECT/i)?"kp-log-line-warn":v.match(/error|crit|emerg/i)?"kp-log-line-err":v.match(/warn/i)?"kp-log-line-warn":v.match(/info|notice/i)?"kp-log-line-info":"",g.textContent=v,n.appendChild(g)});n.childElementCount>Ee;)n.removeChild(n.firstChild);l.checked&&(n.scrollTop=n.scrollHeight)}function b(){a&&(a.close(),a=null),s=!1,i.disabled=!1,r.disabled=!0,p&&(p.textContent="Disconnected")}i.addEventListener("click",()=>{b();let m=t.querySelector("#log-container").value,v=t.querySelector("#log-tail").value,g=location.protocol==="https:"?"wss":"ws",f=m==="waf"?`${g}://${location.host}/api/sites/${e}/logs/waf?tail=${v}`:m==="proxy"?`${g}://${location.host}/api/sites/${e}/logs/proxy?tail=${v}`:m==="access"?`${g}://${location.host}/api/sites/${e}/logs/proxy?tail=${v}`:`${g}://${location.host}/api/sites/${e}/logs?container=${m}&tail=${v}`;a=new WebSocket(f),a.onopen=()=>{s=!0,i.disabled=!0,r.disabled=!1,p&&(p.textContent=`Connected \u2014 ${m}`)},a.onmessage=w=>d(w.data),a.onerror=()=>{},a.onclose=()=>{s=!1,i.disabled=!1,r.disabled=!0,p&&(p.textContent="Disconnected")}}),r.addEventListener("click",b),o.addEventListener("click",()=>{n.innerHTML=""}),t.querySelector("#log-container").addEventListener("change",()=>{a&&a.readyState===WebSocket.OPEN&&(b(),i.click())});let k=h.go.bind(h);h.go=function(m,v={}){return a&&b(),k(m,v)}}function Le(t){switch(t){case"valid":return'<span class="kp-ssl-valid" uk-icon="icon: lock; ratio: 0.85" uk-tooltip="Valid SSL certificate"></span>';case"self-signed":return'<span class="kp-ssl-self-signed" uk-icon="icon: lock; ratio: 0.85" uk-tooltip="Self-signed certificate"></span>';default:return'<span class="kp-ssl-none" uk-icon="icon: warning; ratio: 0.85" uk-tooltip="No SSL certificate"></span>'}}async function Wt(t,e){try{let a=await u.get(`/ssl-status?domain=${encodeURIComponent(t)}`),s=document.getElementById(`ssl-icon-${e}`);s&&(s.outerHTML=Le(a.status))}catch{}}function jt(t){t.forEach(e=>Wt(e.Domain,e.ID))}function Ot(t,e,a,s=0,n=null){let i=t.SiteType!==3&&t.PMAPort>0;return`
        <div class="uk-grid-medium" uk-grid>
            <div class="uk-width-1-2@m">
                <div class="kp-card uk-padding-small">
                    <h3 class="kp-view-title uk-margin-bottom">Site Info</h3>
                    <table class="uk-table uk-table-small uk-table-divider uk-margin-remove">
                        <tbody>
                            <tr><td class="kp-muted">Name</td><td>${t.Name}</td></tr>
                            ${n?`<tr><td class="kp-muted">Parent</td><td><a href="javascript:void(0)" data-action="manage" data-id="${s}" style="color:var(--kp-cyan)">${n}</a></td></tr>`:""}
                            <tr><td class="kp-muted">Internal Port</td><td>:${t.Port}</td></tr>
                            <tr><td class="kp-muted">Type</td><td>${H(t.SiteType)}</td></tr>
                            <tr><td class="kp-muted">Version</td><td>${q(t)}</td></tr>
                            <tr><td class="kp-muted">Status</td><td>${B(t.SiteStatus)}</td></tr>
                            <tr><td class="kp-muted">Containers</td><td><div id="sd-health-badges" class="kp-health-badges"></div></td></tr>
                            <tr><td class="kp-muted">Created</td><td>${new Date(t.Created).toLocaleString()}</td></tr>
                        </tbody>
                    </table>
                </div>
                
                ${n?`
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

                ${i?`
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
                        ${e.length?e.map(zt).join(""):'<p class="kp-muted uk-text-small">No domains configured</p>'}
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
        </div>`}function zt(t){return`<div class="uk-flex uk-flex-between uk-flex-middle kp-config-row" data-domain-id="${t.ID}">
        <div class="uk-flex uk-flex-middle kp-domain-row-inner">
            <span id="ssl-icon-${t.ID}" class="kp-ssl-pending" uk-icon="icon: more; ratio: 0.85"></span>
            <span class="uk-text-small kp-mono">${t.Domain}</span>
        </div>
        <button class="kp-config-del" data-action="delete-domain" data-did="${t.ID}" title="Remove">
            <span uk-icon="icon: close; ratio: 0.8"></span>
        </button>
    </div>`}function Vt(t,e){t.querySelector("#domain-add-btn")?.addEventListener("click",()=>{t.querySelector("#domain-add-form").classList.remove("uk-hidden")}),t.querySelector("#domain-cancel-btn")?.addEventListener("click",()=>{t.querySelector("#domain-add-form").classList.add("uk-hidden")}),t.querySelector("#domain-save-btn")?.addEventListener("click",async()=>{let a=t.querySelector("#domain-add-input").value.trim();if(a)try{let s=await u.post(`/sites/${e}/domains`,{domain:a});t.querySelector("#domain-list").insertAdjacentHTML("beforeend",zt(s)),Wt(s.Domain,s.ID),t.querySelector("#domain-add-form").classList.add("uk-hidden"),t.querySelector("#domain-add-input").value="",c.success("Domain added")}catch(s){c.error(s.message)}}),t.querySelector("#domain-list")?.addEventListener("click",async a=>{let s=a.target.closest('[data-action="delete-domain"]');if(!(!s||!await $("Remove Domain","Remove this domain from the site?")))try{await u.delete(`/sites/${e}/domains/${s.dataset.did}`),s.closest("[data-domain-id]").remove(),c.success("Domain removed")}catch(i){c.error(i.message)}})}function Jt(t,e,a=null){t.querySelector("#sftp-regen-btn")?.addEventListener("click",async()=>{let s=t.querySelector("#sftp-regen-btn"),n=s.innerHTML;s.disabled=!0,s.innerHTML='<div uk-spinner="ratio: 0.5"></div>';try{await u.post(`/sites/${e}/sftp-regen`),c.success("SFTP password regenerated"),h.go("site-detail",{id:String(e)})}catch(i){c.error(i.message),s.disabled=!1,s.innerHTML=n}}),t.querySelector("#sftp-copy-btn")?.addEventListener("click",()=>{let s=t.querySelector("#sftp-pass-display")?.textContent;if(s)if(navigator.clipboard)navigator.clipboard.writeText(s).then(()=>c.success("Password copied to clipboard")).catch(()=>c.error("Failed to copy password"));else{let n=document.createElement("textarea");n.value=s,n.style.cssText="position:fixed;opacity:0",document.body.appendChild(n),n.select(),document.execCommand("copy"),document.body.removeChild(n),c.success("Password copied to clipboard")}}),t.querySelector("#pma-open-btn")?.addEventListener("click",async()=>{let s=t.querySelector("#pma-open-btn"),n=s.innerHTML;s.disabled=!0,s.innerHTML='<div uk-spinner="ratio: 0.5"></div> Opening...';try{let i=await u.post(`/sites/${e}/pma-token`);window.open(i.url,"_blank")}catch(i){c.error(i.message)}finally{s.disabled=!1,s.innerHTML=n}}),t.querySelector("#sync-pull-btn")?.addEventListener("click",async()=>{if(await ot("pull",a.Name,t.querySelector('[data-action="manage"][data-id="'+a.ParentID+'"]')?.textContent?.trim()??"parent"))try{c.success("Pull from parent complete")}catch(n){c.error(n.message)}}),t.querySelector("#sync-push-btn")?.addEventListener("click",async()=>{if(await ot("push",a.Name,t.querySelector('[data-action="manage"][data-id="'+a.ParentID+'"]')?.textContent?.trim()??"parent"))try{c.success("Push to parent complete")}catch(n){c.error(n.message)}})}function Kt(){return`
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
        </div>`}function Gt(t="",e="",a=301){return`
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
        </div>`}async function Qt(t){let e=document.getElementById("redirects-list");if(!e)return;e.innerHTML="";let a=await u.get(`/sites/${t}/redirects`);e.innerHTML=a.map(s=>Gt(s.Source,s.Target,s.Code)).join("")}function Xt(t,e){let a=new AbortController,s={signal:a.signal};t.addEventListener("click",n=>{n.target.closest("#redirect-add-btn")&&document.getElementById("redirects-list").insertAdjacentHTML("beforeend",Gt()),n.target.closest(".redirect-remove-btn")&&n.target.closest(".redirect-row").remove()},s),t.addEventListener("click",async n=>{if(!n.target.closest("#redirect-save-btn"))return;let i=[...document.querySelectorAll(".redirect-row")].map(r=>({Source:r.querySelector(".redirect-source").value.trim(),Target:r.querySelector(".redirect-target").value.trim(),Code:parseInt(r.querySelector(".redirect-code").value,10)}));try{await u.put(`/sites/${e}/redirects`,i),c.success("Redirects saved")}catch(r){c.error(r.message||"Failed to save redirects")}},s),t.__redirectsAbort?.abort(),t.__redirectsAbort=a}var Te=[{label:"Cache Flush",cmd:"cache flush"},{label:"Plugin List",cmd:"plugin list"},{label:"Theme List",cmd:"theme list"},{label:"User List",cmd:"user list"},{label:"Core Check",cmd:"core check-update"},{label:"Core Update",cmd:"core update"},{label:"Plugin Updates",cmd:"plugin update --all"},{label:"Theme Updates",cmd:"theme update --all"},{label:"Rewrite Flush",cmd:"rewrite flush"},{label:"Transient Delete",cmd:"transient delete --all"},{label:"Search Replace",cmd:"search-replace '' ''"}];function Yt(t){return`
        <div>
            <div class="kp-log-controls" style="flex-wrap:wrap;gap:6px">
                ${Te.map(e=>`
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
        </div>`}function Zt(t,e){let a=t.querySelector("#wpcli-output"),s=t.querySelector("#wpcli-input"),n=t.querySelector("#wpcli-run"),i=t.querySelector("#wpcli-clear"),r=t.querySelector("#wpcli-status"),o=[],l=-1;function p(k,m=""){k.split(`
`).forEach(v=>{if(!v)return;let g=document.createElement("div");m?g.className=m:g.className=v.match(/error|fatal|critical/i)?"kp-log-line-err":v.match(/warning|warn/i)?"kp-log-line-warn":v.match(/success|done\]/i)?"kp-log-line-info":"",g.textContent=v,a.appendChild(g)}),a.scrollTop=a.scrollHeight}function d(k){if(k=k.trim(),!k)return;o.unshift(k),l=-1,p(`wp> ${k}`,"kp-log-line-info"),s.disabled=!0,n.disabled=!0,r&&(r.textContent="Running...");let m=location.protocol==="https:"?"wss":"ws",v=new WebSocket(`${m}://${location.host}/api/sites/${e}/wpcli`);v.onopen=()=>{v.send(JSON.stringify({command:k}))},v.onmessage=g=>{let f=g.data;if(f.trim()==="[done]"){v.close();return}if(f.startsWith("[info]")){p(f,"kp-muted");return}if(f.startsWith("[error]")){p(f,"kp-log-line-err");return}p(f)},v.onerror=()=>{p("[error] WebSocket connection failed","kp-log-line-err")},v.onclose=()=>{s.disabled=!1,n.disabled=!1,r&&(r.textContent="Ready"),s.focus()}}n.addEventListener("click",()=>{d(s.value),s.value=""}),s.addEventListener("keydown",k=>{if(k.key==="Enter"){d(s.value),s.value="",l=-1;return}if(k.key==="ArrowUp"){k.preventDefault(),l<o.length-1&&(l++,s.value=o[l]);return}k.key==="ArrowDown"&&(k.preventDefault(),l>0?(l--,s.value=o[l]):(l=-1,s.value=""))}),t.querySelectorAll('[data-action="wpcli-quick"]').forEach(k=>{k.addEventListener("click",()=>{let m=k.dataset.cmd;if(m.startsWith("search-replace")){s.value=m,s.focus();let v=m.indexOf("''")+1;s.setSelectionRange(v,v);return}d(m)})}),i.addEventListener("click",()=>{a.innerHTML=""});let b=h.go.bind(h);h.go=function(k,m={}){return b(k,m)},s.focus()}var j=null,I=null;function _e(){return`
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
        </div>`}function te(t){let e=t.querySelector("#kp-site-pills"),a=t.querySelector("#kp-site-switcher"),s=t.querySelector("#kp-manage-pill"),n=t.querySelector("#kp-manage-dropdown");if(!e||!a)return;function i(o,l=!1){UIkit.switcher(a).show(o),e.querySelectorAll(":scope > li[data-pill]").forEach(p=>p.classList.remove("kp-pill-active")),l?(s?.classList.add("kp-pill-active"),n?.querySelectorAll("a[data-switcher]").forEach(p=>{p.classList.toggle("kp-dd-active",parseInt(p.dataset.switcher,10)===o)})):(s?.classList.remove("kp-pill-active"),n?.querySelectorAll("a[data-switcher]").forEach(p=>p.classList.remove("kp-dd-active")))}e.querySelectorAll(":scope > li[data-pill] > a").forEach(o=>{o.addEventListener("click",l=>{l.preventDefault();let p=parseInt(o.closest("li").dataset.pill,10);i(p,!1)})}),s?.querySelector(".kp-pill-dropdown-btn")?.addEventListener("click",o=>{o.stopPropagation(),n.hidden=!n.hidden,s.classList.toggle("kp-pill-active",!n.hidden)}),n?.querySelectorAll("a[data-switcher]").forEach(o=>{o.addEventListener("click",l=>{l.preventDefault(),n.hidden=!0,i(parseInt(o.dataset.switcher,10),!0)})}),document.addEventListener("click",o=>{n&&!s.contains(o.target)&&(n.hidden=!0)},{capture:!0}),UIkit.switcher(a).show(0)}async function ee(t){let e=document.getElementById("waf-tab-panel");if(!e)return;e.innerHTML=_e();let a=document.getElementById("waf-export-btn");a&&(a.href=`/api/sites/${t}/waf/export`);try{let s=await u.get(`/sites/${t}/waf`),n=document.getElementById("waf-override"),i=document.getElementById("waf-site-exclusions");n&&(n.value=String(s.Override??0)),i&&(i.value=s.Exclusions??"");let r=document.getElementById("waf-plugins-list");if(r){let[o,l]=await Promise.all([u.get("/settings/waf/plugins"),u.get(`/sites/${t}/waf/plugins`)]),p=new Set(l??[]);!o||o.length===0?r.innerHTML='<span class="kp-muted uk-text-small">No plugins found in local CRS install.</span>':(r.innerHTML=`
                    <div class="waf-plugin-pills">
                        ${o.map(d=>`
                        <span class="waf-plugin-pill ${p.has(d)?"active":""}"
                            data-plugin="${d}">${d}</span>
                        `).join("")}
                    </div>`,r.querySelectorAll(".waf-plugin-pill").forEach(d=>{d.addEventListener("click",()=>d.classList.toggle("active"))}))}}catch(s){c.error("Failed to load WAF settings: "+s.message)}}function Pe(t,e){j&&j.abort(),j=new AbortController,t.addEventListener("submit",async a=>{if(a.target.id!=="waf-override-form")return;a.preventDefault();let s=a.target.querySelector('[type="submit"]'),n=s.innerHTML;s.disabled=!0,s.innerHTML='<div uk-spinner="ratio: 0.6"></div> Saving...';let i=new FormData(a.target),r={override:parseInt(i.get("override"),10),exclusions:i.get("exclusions").trim()};try{await u.put(`/sites/${e}/waf`,r);let o=[...document.querySelectorAll(".waf-plugin-pill.active")].map(l=>l.dataset.plugin);await u.put(`/sites/${e}/waf/plugins`,o),c.success("WAF override saved \u2014 engine recompiling in background")}catch(o){c.error(o.message)}finally{s.disabled=!1,s.innerHTML=n}},{signal:j.signal}),t.querySelector("#waf-import")?.addEventListener("change",async a=>{let s=a.target.files[0];if(!s)return;let n=new FormData;n.append("file",s);try{let i=await fetch(`/api/sites/${e}/waf/import`,{method:"POST",body:n}),r=i.status===204?null:await i.json().catch(()=>null);if(!i.ok)throw new Error(r?.error||`HTTP ${i.status}`);await ee(e),c.success("WAF settings imported")}catch(i){c.error(i.message)}finally{a.target.value=""}})}function Ce(){return`
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
        </div>`}function mt(t="",e="",a=!1){return`
        <div class="rp-route-row uk-flex uk-flex-middle uk-margin-small-bottom" style="gap:8px">
            <input class="uk-input kp-input" style="flex:1" placeholder="example.com" value="${t}" data-field="domain">
            <input class="uk-input kp-input" style="flex:2" placeholder="https://10.0.0.1:8080" value="${e}" data-field="upstream">
            <label style="white-space:nowrap;font-size:0.75rem;color:var(--kp-text-dim)" title="Send incoming domain as Host header instead of upstream hostname">
                <input type="checkbox" class="uk-checkbox" data-field="pass_host" ${a?"checked":""}> Pass Host
            </label>
            <button class="uk-button kp-btn-ghost kp-btn-sm rp-remove-row" uk-tooltip="Remove"><span uk-icon="trash"></span></button>
        </div>`}async function Ie(t){let e=document.getElementById("rp-routes-list");if(e)try{let a=await u.get(`/sites/${t}/rp-routes`);e.innerHTML=a.length?a.map(s=>mt(s.Domain,s.Upstream,s.PassHost)).join(""):mt()}catch(a){c.error("Failed to load routes: "+a.message)}}function Be(t,e){t.addEventListener("click",async a=>{if(a.target.closest("#rp-add-row")){document.getElementById("rp-routes-list").insertAdjacentHTML("beforeend",mt());return}if(a.target.closest(".rp-remove-row")){a.target.closest(".rp-route-row").remove();return}if(!a.target.closest("#rp-save-btn"))return;let s=a.target.closest("#rp-save-btn"),n=s.innerHTML;s.disabled=!0,s.innerHTML='<div uk-spinner="ratio: 0.6"></div> Saving...';let i=[...document.querySelectorAll(".rp-route-row")].map(r=>({Domain:r.querySelector('[data-field="domain"]').value.trim(),Upstream:r.querySelector('[data-field="upstream"]').value.trim(),PassHost:r.querySelector('[data-field="pass_host"]').checked})).filter(r=>r.Domain&&r.Upstream);try{await u.put(`/sites/${e}/rp-routes`,i),c.success("Routes saved")}catch(r){c.error(r.message)}finally{s.disabled=!1,s.innerHTML=n}},{signal:j.signal})}function qe(t){return t.endsWith("-nginx")?"world":t.endsWith("-php")?"code":t.endsWith("-db")?"database":t.endsWith("-redis")?"server":t.endsWith("-varnish")?"grid":t.endsWith("-pma")?"table":t.endsWith("-app")?"laptop":"bolt"}function ae(t){let e=t.split("-").pop();return{nginx:"Nginx",php:"PHP-FPM",db:"MariaDB",redis:"Redis",varnish:"Varnish",pma:"phpMyAdmin",app:"App"}[e]??e}function kt(t){switch(t){case"healthy":return"var(--kp-success)";case"unhealthy":return"var(--kp-danger)";case"starting":return"var(--kp-warning)";default:return"var(--kp-text-dim)"}}function Me(t){return!t||!t.length?"":t.filter(e=>!e.name.endsWith("-infra")).map(e=>`
            <span class="kp-health-badge"
                data-container="${e.name}"
                title="Restart the Container"
                style="cursor:pointer;color:${kt(e.status)}">
                <span uk-icon="icon: ${qe(e.name)}; ratio: 1.1"></span>
                <span class="kp-health-badge-label">${ae(e.name)}</span>
            </span>
        `).join("")}function De(t,e){I&&(I.close(),I=null);let a=document.getElementById("sd-health-badges");if(!a)return;let s=location.protocol==="https:"?"wss":"ws";I=new WebSocket(`${s}://${location.host}/api/sites/${e}/health/stream`),I.onmessage=n=>{try{let i=JSON.parse(n.data);a.innerHTML=Me(i),a.querySelectorAll(".kp-health-badge").forEach(r=>{r.addEventListener("click",async()=>{r.style.color=kt("starting");let o=r.dataset.container,l=o.split("-").pop();try{await u.post(`/sites/${e}/containers/${l}/restart`),c.success(`${ae(o)} restarted`)}catch(p){r.style.color=kt("none"),c.error(p.message)}})})}catch{}},I.onerror=()=>{},I.onclose=()=>{I=null}}async function se(t,{id:e}){let[{site:a,domains:s,sftp:n},i,r]=await Promise.all([u.get(`/sites/${e}`),u.get("/sites"),u.get(`/sites/${e}/configs`)]),o=Array.isArray(i)?i:[],l=a.SiteType===1||a.SiteType===2,p=a.SiteType===6,d=[1,2,4,5].includes(a.SiteType);if(t.innerHTML=`
        <div class="kp-view-header">
            <div class="uk-flex uk-flex-middle" style="gap:12px">
                <button class="kp-btn-icon" id="sd-back"><span uk-icon="arrow-left"></span></button>
                <div class="kp-site-nav-wrap">
                    <select id="sd-site-nav" class="uk-select kp-select">
                        ${o.map(b=>`<option value="${b.ID}" ${b.ID===a.ID?"selected":""}>${b.Name}</option>`).join("")}
                    </select>
                    <span class="kp-site-nav-arrow">&#9660;</span>
                </div>
                ${p?"":B(a.SiteStatus)}
            </div>
            <div class="uk-flex" style="gap:8px;flex-wrap:wrap">
                ${p?"":`
                ${a.SiteStatus===1?`<button class="uk-button kp-btn-ghost kp-btn-sm" data-action="stop" data-id="${e}" uk-tooltip="Stop the Site"><span uk-icon="ban"></span></button>`:`<button class="uk-button kp-btn-ghost kp-btn-sm" data-action="start" data-id="${e}" uk-tooltip="Start the Site"><span uk-icon="play"></span></button>`}
                <button class="uk-button kp-btn-ghost kp-btn-sm" data-action="restart" data-id="${e}" uk-tooltip="Restart the Site"><span uk-icon="refresh"></span></button>
                <button class="uk-button kp-btn-ghost kp-btn-sm" data-action="flush" data-id="${e}" uk-tooltip="Flush the Caches"><span uk-icon="bolt"></span></button>
                <button class="uk-button kp-btn-ghost kp-btn-sm" id="sd-recreate" uk-tooltip="Recreate &amp; Update the Pod"><span uk-icon="history"></span></button>
                <button class="uk-button kp-btn-ghost kp-btn-sm" id="sd-clone" uk-tooltip="Clone the Site"><span uk-icon="move"></span></button>
                `}
                <button class="uk-button kp-btn-ghost kp-btn-sm" id="sd-edit" uk-tooltip="Edit the Site"><span uk-icon="pencil"></span></button>
            </div>
        </div>
 
        ${p?`
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
            <li>${Ce()}</li>
            <li>${ct(e,a.SiteType)}</li>
            <li>${ut(e,a.SiteType)}</li>
            <li>${N(e)}</li>
            <li id="waf-tab-panel"></li>
            <li>${dt()}</li>
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
                    ${a.SiteType===1?`<a href="#" data-switcher="${l?11:10}"><span uk-icon="icon: file-text; ratio: 0.85"></span> WP-CLI</a>`:""}
                    <a href="#" data-switcher="${a.SiteType===1?l?12:11:l?11:10}"><span uk-icon="icon: history; ratio: 0.85"></span> Backups</a>
                    ${d?`<a href="#" data-switcher="${a.SiteType===1?l?13:12:l?12:11}"><span uk-icon="icon: clock; ratio: 0.85"></span> Crons</a>`:""}
                    <a href="#" data-switcher="${a.SiteType===1?l?14:13:l?13:12}"><span uk-icon="icon: forward; ratio: 0.85"></span> Redirects</a>                
                </div>
            </li>
            <li data-pill="1"><a href="#">Stats</a></li>
            <li data-pill="${l?7:6}"><a href="#">Logs</a></li>
        </ul>

        <!-- switcher panels (driven by pills above) -->
        <ul class="uk-switcher" id="kp-site-switcher">
            <li>${Ot(a,s??[],n,a.ParentID??0,o.find(b=>b.ID===a.ParentID)?.Name??null)}</li>
            <li>${ct(e,a.SiteType)}</li>
            <li>${W(e,1,r[1])}</li>
            ${l?`<li>${W(e,2,r[2])}</li>`:""}
            <li>${W(e,3,r[3])}</li>
            <li>${W(e,4,r[4])}</li>
            <li>${Dt(e,r[5])}</li>
            <li>${ut(e,a.SiteType)}</li>
            <li>${N(e)}</li>
            <li id="waf-tab-panel"></li>
            <li>${dt()}</li>
            ${a.SiteType===1?`<li>${Yt(e)}</li>`:""}
            <li>${Bt(e)}</li>
            ${d?`<li>${Ht(e)}</li>`:""}
            <li>${Kt()}</li>
        </ul>`}`,document.getElementById("sd-back").addEventListener("click",()=>h.go("sites")),document.getElementById("sd-edit").addEventListener("click",()=>J(a)),document.getElementById("sd-site-nav")?.addEventListener("change",b=>{h.go("site-detail",{id:b.target.value})}),Z(t),C(t),Ut(t,e),Pe(t,e),ee(e),p){Be(t,e),Ie(e),te(t);return}document.getElementById("sd-recreate").addEventListener("click",async()=>{S("Recreating Pod","Recreating containers for this site...");try{await u.post(`/sites/${e}/recreate`),y(),c.success("Pod recreated"),h.go("site-detail",{id:e})}catch(b){y(),c.error(b.message)}}),document.getElementById("sd-clone")?.addEventListener("click",async()=>{let b=await V(a.Name);if(b){S("Cloning Site","Copying files and database \u2014 this may take a few minutes...");try{await u.post(`/sites/${e}/clone`,{name:b}),y(),c.success(`Site cloned as '${b}'`),h.go("sites")}catch(k){y(),c.error(k.message)}}}),t.querySelectorAll("[data-action]:not([data-action='wpcli-quick'])").forEach(b=>{b.addEventListener("click",async()=>{let k=b.dataset.action;if(k==="flush"){try{await u.post(`/sites/${e}/flush`),c.success("Caches flushed")}catch(v){c.error(v.message)}return}S(`${{start:"Starting",stop:"Stopping",restart:"Restarting",update:"Updating"}[k]??k} Pod`,"Please wait...");try{await u.post(`/sites/${e}/${k}`),y(),c.success(`Site ${k} successful`),h.go("site-detail",{id:e})}catch(v){y(),c.error(v.message)}})}),At(t,e),Vt(t,e),a.SiteType===1&&Zt(t,e),Jt(t,e,a),qt(t,e),R(t,e),d&&(Ft(t,e),et(t,e)),Xt(t,e),Qt(e),St(t,e,a.SiteType),$t(e,a.SiteType),De(t,e),te(t),Mt(t,e),tt(e),jt(s??[])}async function at(t){let e=document.getElementById("totp-qr-img"),a=document.getElementById("totp-qr-wrap");if(!e||!a)return;if(a.querySelectorAll(".totp-uri-text").forEach(n=>n.remove()),typeof QRCode<"u")try{let n=await new Promise((i,r)=>{QRCode.toDataURL(t,{width:220,margin:2},(o,l)=>{o?r(o):i(l)})});e.src=n,e.style.display="";return}catch{}let s=document.createElement("p");s.className="totp-uri-text kp-muted uk-text-small",s.style.wordBreak="break-all",s.textContent=t,a.appendChild(s)}function st(t){document.getElementById("kp-backup-codes-modal")?.remove();let a=`
        <div id="kp-backup-codes-modal" uk-modal="bg-close:false;esc-close:false">
            <div class="uk-modal-dialog kp-modal uk-modal-body" style="max-width:480px">
                <h3 class="uk-modal-title" style="color:var(--kp-yellow,#f0b429)">
                    <span uk-icon="warning"></span>&nbsp;Save Your Backup Codes
                </h3>
                <p class="kp-muted uk-text-small uk-margin-small-bottom">
                    These codes let you access your account if you lose your authenticator.
                    Each code works <strong>once only</strong>. Keep them somewhere safe.
                </p>
                <div class="kp-backup-codes-grid uk-margin-small">${t.map(n=>`<code class="kp-backup-code">${n}</code>`).join("")}</div>
                <p class="kp-muted uk-text-small uk-margin-small-top">
                    These codes will <strong>not</strong> be shown again.
                </p>
                <div class="uk-flex uk-flex-right uk-margin-top" style="gap:8px">
                    <button id="kp-backup-copy-btn" class="uk-button kp-btn-ghost">Copy All</button>
                    <button id="kp-backup-done-btn" class="uk-button kp-btn-primary">I've Saved These</button>
                </div>
            </div>
        </div>`;document.body.insertAdjacentHTML("beforeend",a);let s=UIkit.modal("#kp-backup-codes-modal");s.show(),document.getElementById("kp-backup-copy-btn").addEventListener("click",()=>{let n=t.join(`
`),i=document.getElementById("kp-backup-copy-btn");if(navigator.clipboard)navigator.clipboard.writeText(n).then(()=>{i.textContent="Copied!"});else{let r=document.createElement("textarea");r.value=n,r.style.cssText="position:fixed;opacity:0",document.body.appendChild(r),r.select();try{document.execCommand("copy"),i.textContent="Copied!"}catch{}r.remove()}}),document.getElementById("kp-backup-done-btn").addEventListener("click",()=>{s.hide(),document.getElementById("kp-backup-codes-modal")?.remove(),h.go("users")})}function ne(t){document.body.insertAdjacentHTML("beforeend",`
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
        </div>`);let a=UIkit.modal("#kp-create-user-modal");a.show(),document.getElementById("create-user-form").addEventListener("submit",async s=>{s.preventDefault();let n=s.target.querySelector('[type="submit"]'),i=n.innerHTML;n.disabled=!0,n.innerHTML='<div uk-spinner="ratio: 0.6"></div> Creating...';let r=new FormData(s.target),o={fname:r.get("fname").trim(),lname:r.get("lname").trim(),uname:r.get("uname").trim(),email:r.get("email").trim(),phone:r.get("phone").trim(),password:r.get("password"),role:parseInt(r.get("role")),notify_email:r.get("notify_email")==="on",notify_sms:r.get("notify_sms")==="on"};try{let l=D(await u.post("/users",o));document.getElementById("users-table-body").insertAdjacentHTML("beforeend",bt(l)),c.success(`User '${l.uname}' created`),document.getElementById("create-user-form").style.display="none",document.getElementById("cu-totp-section").style.display="",Ae(l.id,a)}catch(l){c.error(l.message),n.disabled=!1,n.innerHTML=i}}),document.getElementById("kp-create-user-modal").addEventListener("hidden",()=>document.getElementById("kp-create-user-modal")?.remove())}function Ae(t,e){let a=()=>{e.hide(),document.getElementById("kp-create-user-modal")?.remove(),h.go("users")};document.getElementById("cu-totp-skip-btn").addEventListener("click",a),document.getElementById("cu-totp-setup-btn").addEventListener("click",async()=>{let s=document.getElementById("cu-totp-setup-btn");s.disabled=!0,s.textContent="Setting up\u2026";try{let n=await u.post(`/users/${t}/totp/setup`,{});document.getElementById("totp-secret-text").textContent=n.secret,document.getElementById("totp-setup-area").style.display="",document.getElementById("cu-totp-skip-btn").style.display="none",await at(n.uri)}catch(n){c.error(n.message),s.disabled=!1,s.textContent="Enable TOTP"}}),document.getElementById("cu-totp-confirm-btn").addEventListener("click",async()=>{let s=document.getElementById("totp-confirm-code").value.trim();if(s.length!==6){c.error("Enter a 6-digit code");return}let n=document.getElementById("cu-totp-confirm-btn");n.disabled=!0;try{let i=await u.post(`/users/${t}/totp/confirm`,{code:s});e.hide(),document.getElementById("kp-create-user-modal")?.remove(),c.success("TOTP enabled"),i.backup_codes?.length?st(i.backup_codes):h.go("users")}catch(i){c.error(i.message),n.disabled=!1}})}async function ie(t,e){document.getElementById("kp-edit-user-modal")?.remove();let a;try{a=D(await u.get(`/users/${e}`))}catch(p){c.error(p.message);return}let s=window.KP?.user?.role===99,n=`
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
        </div>`;document.body.insertAdjacentHTML("beforeend",n);let i=UIkit.modal("#kp-edit-user-modal");i.show(),document.getElementById("edit-user-form").addEventListener("submit",async p=>{p.preventDefault();let d=p.target.querySelector('[type="submit"]'),b=d.innerHTML;d.disabled=!0,d.innerHTML='<div uk-spinner="ratio: 0.6"></div> Saving...';let k=new FormData(p.target),m={fname:k.get("fname").trim(),lname:k.get("lname").trim(),email:k.get("email").trim(),phone:k.get("phone").trim(),notify_email:k.get("notify_email")==="on",notify_sms:k.get("notify_sms")==="on"};if(s){m.role=parseInt(k.get("role"));let g=k.get("uname");g&&(m.uname=g.trim())}let v=k.get("password");v&&(m.password=v);try{await u.put(`/users/${e}`,m),i.hide(),document.getElementById("kp-edit-user-modal")?.remove(),c.success("User updated"),h.go("users")}catch(g){c.error(g.message),d.disabled=!1,d.innerHTML=b}});let r=document.getElementById("totp-setup-btn");r&&r.addEventListener("click",async()=>{r.disabled=!0,r.textContent="Setting up\u2026";try{let p=await u.post(`/users/${e}/totp/setup`,{});document.getElementById("totp-secret-text").textContent=p.secret,document.getElementById("totp-setup-area").style.display="",await at(p.uri)}catch(p){c.error(p.message),r.disabled=!1,r.textContent="Enable TOTP"}});let o=document.getElementById("totp-confirm-btn");o&&o.addEventListener("click",async()=>{let p=document.getElementById("totp-confirm-code").value.trim();if(p.length!==6){c.error("Enter a 6-digit code");return}o.disabled=!0;try{let d=await u.post(`/users/${e}/totp/confirm`,{code:p});i.hide(),document.getElementById("kp-edit-user-modal")?.remove(),c.success("TOTP enabled"),d.backup_codes?.length?st(d.backup_codes):h.go("users")}catch(d){c.error(d.message),o.disabled=!1}});let l=document.getElementById("totp-disable-btn");l&&l.addEventListener("click",async()=>{l.disabled=!0;try{await u.delete(`/users/${e}/totp`),c.success("TOTP disabled"),i.hide(),document.getElementById("kp-edit-user-modal")?.remove(),h.go("users")}catch(p){c.error(p.message),l.disabled=!1}}),document.getElementById("kp-edit-user-modal").addEventListener("hidden",()=>document.getElementById("kp-edit-user-modal")?.remove())}async function oe(t){if(!_()){t.innerHTML=L("Access denied");return}let e=await u.get("/users");t.innerHTML=`
        <div class="kp-view-header">
            <h1 class="kp-view-title kp-cursor" style="font-size:2rem;">Users</h1>
            <button class="uk-button kp-btn-primary" id="users-new-btn">
                <span uk-icon="plus"></span> New User
            </button>
        </div>
        <div class="kp-table-wrap">
            <table class="uk-table uk-table-divider uk-table-middle uk-table-responsive uk-margin-remove">
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
                    ${e.map(a=>bt(D(a))).join("")}
                </tbody>
            </table>
        </div>`,document.getElementById("users-new-btn").addEventListener("click",()=>ne(t)),Re(t)}function bt(t){let e=t.role===99?'<span class="kp-badge kp-badge-admin">Admin</span>':'<span class="kp-badge kp-badge-manager">Manager</span>',a=[t.notify_email?'<span uk-icon="icon: mail; ratio: 0.85" uk-tooltip="Email notifications on" style="color:var(--kp-success)"></span>':'<span uk-icon="icon: mail; ratio: 0.85" style="color:var(--kp-text-dim)" uk-tooltip="Email notifications off"></span>',t.notify_sms?'<span uk-icon="icon: receiver; ratio: 0.85" uk-tooltip="SMS notifications on" style="color:var(--kp-success)"></span>':'<span uk-icon="icon: receiver; ratio: 0.85" style="color:var(--kp-text-dim)" uk-tooltip="SMS notifications off"></span>'].join(" ");return`<tr data-user-id="${t.id}">
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
    </tr>`}function Re(t){t.addEventListener("click",async e=>{let a=e.target.closest('[data-action="delete-user"]');if(!(!a||!await $("Delete User","Delete this user? This cannot be undone.")))try{await u.delete(`/users/${a.dataset.uid}`),a.closest("tr").remove(),c.success("User deleted")}catch(n){c.error(n.message)}}),t.addEventListener("click",async e=>{let a=e.target.closest('[data-action="edit-user"]');a&&ie(t,a.dataset.uid)})}h.register("dashboard",t=>Tt(t));h.register("sites",t=>Et(t));h.register("site-detail",(t,e)=>se(t,e));h.register("users",t=>oe(t));h.register("settings",t=>Ct(t));h.register("security",t=>_t(t));h.register("admin-logs",t=>gt(t));h.register("audit-log",t=>wt(t));document.addEventListener("click",t=>{let e=t.target.closest("[data-view]");e&&(t.preventDefault(),h.go(e.dataset.view))});document.addEventListener("click",async t=>{let e=t.target.closest("[data-action]");if(!e)return;t.stopPropagation();let{action:a,id:s}=e.dataset;switch(a){case"manage":h.go("site-detail",{id:s});break;case"start":await nt(s,"start","Starting Site","Starting all containers - please wait...");break;case"stop":await nt(s,"stop","Stopping Site","Gracefully stopping all containers - please wait...");break;case"restart":await nt(s,"restart","Restarting Site","Restarting all containers - please wait...");break;case"flush":await nt(s,"flush","Flushing Caches","Clearing container caches - please wait...");break;case"edit":{let n=await u.get(`/sites/${s}`);J(n.site);break}case"clone":{let n=await V(e.dataset.name??s);if(!n)break;S("Cloning Site","Copying files and database \u2014 this may take a few minutes...");try{let i=await u.post(`/sites/${s}/clone`,{name:n}),r=!1,o=0;for(;!r&&o<60;)await new Promise(p=>setTimeout(p,3e3)),r=(await u.get("/sites")).some(p=>p.ID===i.id&&p.SiteStatus===1),o++;y(),r?(c.success(`Site cloned as '${n}'`),h.go("sites")):c.error("Clone timed out \u2014 check container logs")}catch(i){y(),c.error(i.message)}break}case"delete":await He(s);break;case"recreate":S("Recreating Pod","Recreating containers for this site - this may take a few minutes...");try{await u.post(`/sites/${s}/recreate`),y(),c.success("Pod recreated"),h.go("sites")}catch(n){y(),c.error(n.message)}break}});document.addEventListener("kp:bulk-action",async t=>{let{action:e,ids:a}=t.detail;if(!a.length)return;S(`${{start:"Starting",stop:"Stopping",restart:"Restarting",flush:"Flushing Caches"}[e]} ${a.length} Site${a.length!==1?"s":""}`,"Please wait...");let n=await Promise.allSettled(a.map(r=>u.post(`/sites/${r}/${e}`)));y();let i=n.filter(r=>r.status==="rejected").length;i===0?c.success(`${e.charAt(0).toUpperCase()+e.slice(1)} complete for ${a.length} site${a.length!==1?"s":""}`):c.error(`${i} of ${a.length} sites failed \u2014 check logs`),["start","stop","restart"].includes(e)&&h.go("sites")});async function nt(t,e,a,s){S(a,s);try{await u.post(`/sites/${t}/${e}`),y(),c.success(a+" complete")}catch(n){y(),c.error(n.message)}}async function He(t){if(!await $("Delete Site",`This will stop and permanently remove the pod and all its data. Are you sure?

A final backup will be created before deletion. This may take a moment.`))return;S("Deleting Site","Creating final backup and removing the pod \u2014 please wait...");let a;try{a=await fetch(`/api/sites/${t}`,{method:"DELETE"})}catch{}if(y(),a?.ok&&a.headers.get("Content-Type")?.includes("gzip")){let r=(a.headers.get("Content-Disposition")??"").match(/filename="([^"]+)"/)?.[1]??`${t}_final.tar.gz`,o=await a.blob(),l=document.createElement("a");l.href=URL.createObjectURL(o),l.download=r,l.click(),URL.revokeObjectURL(l.href),c.success("Site deleted. Final backup downloaded."),h.go("sites");return}let s=!1,n=0;for(;!s&&n<10;){try{await new Promise(r=>setTimeout(r,2e3)),s=!(await u.get("/sites")).find(r=>r.ID===parseInt(t))}catch{}n++}s?(c.success("Site deleted. Final backup saved to S3."),h.go("sites")):c.error("Delete failed - site still exists after 20s")}if(window.KP?.user?.role===99){let t=document.getElementById("kp-resource-warning"),e=document.getElementById("kp-resource-warning-msg"),a=async()=>{try{let s=await u.get("/settings/resource-warning");s?.active&&t&&e?(e.textContent=`${s.current_mb}MB used, threshold ${s.threshold_mb}MB \u2014 throttling ${s.offender}.`,t.style.display=""):t&&(t.style.display="none")}catch{}};a(),setInterval(a,3e4)}window.addEventListener("hashchange",()=>{if(h._ownHashChange)return;let{view:t,params:e}=lt();h.go(t,e)});var{view:Ne,params:Fe}=lt();h.go(Ne,Fe);})();
