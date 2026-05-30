"use strict";(()=>{var d={async _req(t,e,a,s=6e4){let n=new AbortController,i=setTimeout(()=>n.abort(),s),o={method:t,headers:{"Content-Type":"application/json"},signal:n.signal};t!=="GET"&&t!=="HEAD"&&(o.headers["X-CSRF-Token"]=window.KP?.csrf??""),a!==void 0&&(o.body=JSON.stringify(a));try{let r=await fetch("/api"+e,o);clearTimeout(i);let l=r.status===204?null:await r.json().catch(()=>null);if(r.status===401)return window.location.href="/login?msg=Your+session+has+expired+%E2%80%94+please+log+in+again",null;if(!r.ok)throw new Error(l?.error||`HTTP ${r.status}`);return l}catch(r){throw clearTimeout(i),r}},get:t=>d._req("GET",t),post:(t,e)=>d._req("POST",t,e),put:(t,e)=>d._req("PUT",t,e),delete:t=>d._req("DELETE",t),patch:(t,e)=>d._req("PATCH",t,e)};var ct=()=>'<div class="kp-spinner"><div uk-spinner="ratio: 1.25"></div></div>',L=t=>`<div class="kp-empty">
        <div class="kp-empty-icon" uk-icon="icon: warning; ratio: 2.5"></div>
        <div class="kp-empty-text">${t}</div>
    </div>`,j=(t,e)=>`<div class="kp-empty">
        <div class="kp-empty-icon" uk-icon="icon: ${t}; ratio: 2.5"></div>
        <div class="kp-empty-text">${e}</div>
    </div>`,P=t=>{let e={1:["running","Running"],2:["stopped","Stopped"],3:["restarting","Restarting"],4:["error","Error"]},[a,s]=e[t]||["stopped","Unknown"];return`<span class="kp-status kp-status-${a}">${s}</span>`},jt=t=>({3:"8.2",4:"8.3",5:"8.4",6:"8.5"})[t]||"?",_=t=>({1:"WordPress",2:"PHP",3:"Static",4:"Node.js",5:".NET",6:"Reverse Proxy"})[t]||"?",D=()=>window.KP.user.role===window.KP.roles.admin,I=t=>{switch(t.SiteType){case 1:case 2:return`PHP ${jt(t.PHPVersion)}`;case 4:return`Node ${{2:"22",4:"24",5:"25",6:"26"}[t.RuntimeVersion]||"?"}`;case 5:return`.NET ${{1:"8.0",2:"9.0",3:"10.0"}[t.RuntimeVersion]||"?"}`;case 6:return"Reverse Proxy";default:return""}},q=t=>({id:t.id??t.ID,uname:t.uname??t.UName,uhash:t.uhash??t.UHash,fname:t.fname??t.FName,lname:t.lname??t.LName,email:t.email??t.Email,phone:t.phone??t.Phone,role:t.role??t.Role,totp_enabled:t.totp_enabled??!1,created:t.created??t.Created});function $(t,e){return new Promise(a=>{document.getElementById("kp-confirm-title").textContent=t,document.getElementById("kp-confirm-message").textContent=e;let s=UIkit.modal("#kp-confirm-modal");document.getElementById("kp-confirm-ok").addEventListener("click",()=>{s.hide(),a(!0)},{once:!0}),s.show(),document.getElementById("kp-confirm-modal").addEventListener("hidden",()=>a(!1),{once:!0})})}function S(t,e){let a=`
        <div id="kp-progress-modal" uk-modal="bg-close: false; esc-close: false; keyboard: false">
            <div class="uk-modal-dialog kp-modal uk-modal-body uk-text-center" style="max-width:420px">
                <div uk-spinner="ratio: 1.5" style="color:var(--kp-blue)"></div>
                <h3 class="uk-modal-title uk-margin-small-top" id="kp-progress-title">${t}</h3>
                <p class="kp-muted uk-text-small" id="kp-progress-message">${e}</p>
                <p class="kp-muted">
                    This may take several minutes while the task(s) complete, make sure to keep screen open until it has completed.
                </p>
            </div>
        </div>`;document.body.insertAdjacentHTML("beforeend",a),UIkit.modal("#kp-progress-modal").show()}function w(){let t=document.getElementById("kp-progress-modal");t&&(UIkit.modal(t).hide(),setTimeout(()=>t.remove(),300))}function W(t){return new Promise(e=>{let a="kp-clone-modal",s=`
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
            </div>`;document.body.insertAdjacentHTML("beforeend",s);let n=UIkit.modal(`#${a}`),i=document.getElementById("kp-clone-name"),o=document.getElementById("kp-clone-ok"),r=document.getElementById("kp-clone-cancel"),l=p=>{n.hide(),setTimeout(()=>document.getElementById(a)?.remove(),300),e(p)};o.addEventListener("click",()=>l(i.value.trim()||null),{once:!0}),r.addEventListener("click",()=>l(null),{once:!0}),document.getElementById(a).addEventListener("hidden",()=>l(null),{once:!0}),n.show(),setTimeout(()=>i.focus(),150),i.addEventListener("keydown",p=>{p.key==="Enter"&&o.click()})})}function et(t,e,a){return new Promise(s=>{let n="kp-sync-modal",i=t==="pull",o=i?"Pull From Parent":"Push To Parent",r=i?"cloud-download":"cloud-upload",l=i?a:e,p=i?e:a,k=`
            <div id="${n}" uk-modal>
                <div class="uk-modal-dialog kp-modal uk-modal-body" style="max-width:460px">
                    <h3 class="uk-modal-title">${o}</h3>
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
                            <span uk-icon="${r}"></span> ${o}
                        </button>
                    </div>
                </div>
            </div>`;document.body.insertAdjacentHTML("beforeend",k);let v=UIkit.modal(`#${n}`),b=document.getElementById("kp-sync-ok"),u=document.getElementById("kp-sync-cancel"),m=g=>{v.hide(),setTimeout(()=>document.getElementById(n)?.remove(),300),s(g)};b.addEventListener("click",()=>m(!0),{once:!0}),u.addEventListener("click",()=>m(!1),{once:!0}),document.getElementById(n).addEventListener("hidden",()=>m(!1),{once:!0}),v.show()})}var h={routes:{},_ownHashChange:!1,register(t,e){this.routes[t]=e},async go(t,e={}){let a=Object.keys(e).length?t+"/"+Object.values(e).join("/"):t;this._ownHashChange=!0,window.location.hash=a,setTimeout(()=>{this._ownHashChange=!1},0),document.querySelectorAll(".kp-nav-link").forEach(i=>{i.classList.toggle("kp-active",i.dataset.view===t)}),document.querySelectorAll(".kp-bn-item[data-view]").forEach(i=>{i.classList.toggle("kp-active",i.dataset.view===t)});let s=this.routes[t];if(!s)return;let n=document.getElementById("kp-view");n.innerHTML=ct();try{await s(n,e)}catch(i){n.innerHTML=L(i.message)}}};function at(){let e=(window.location.hash.replace("#","")||"dashboard").split("/"),a=e[0],s={};return a==="site-detail"&&e[1]&&(s.id=e[1]),{view:a,params:s}}var c={show(t,e="info",a=7e3){let s={success:"check",error:"warning",info:"info"},n=document.createElement("div");n.className=`kp-toast kp-toast-${e}`,n.innerHTML=`<span uk-icon="${s[e]||"info"}"></span><span>${t}</span>`,document.getElementById("kp-toasts").appendChild(n),UIkit.icon(n.querySelector("[uk-icon]")),setTimeout(()=>n.remove(),a)},success:t=>c.show(t,"success"),error:t=>c.show(t,"error"),info:t=>c.show(t,"info")};async function O(t){let e=`
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
        </div>`;document.body.insertAdjacentHTML("beforeend",e);let a=UIkit.modal("#kp-edit-site-modal"),s=document.getElementById("es-site-type"),n=document.getElementById("es-php-version-wrap"),i=document.getElementById("es-node-version-wrap"),o=document.getElementById("es-dotnet-version-wrap"),r=document.getElementById("es-start-command-wrap"),l=document.getElementById("es-wordpress-wrap");a.show();let p=k=>{n.classList.toggle("uk-hidden",k!==1&&k!==2||k===6),i.classList.toggle("uk-hidden",k!==4),o.classList.toggle("uk-hidden",k!==5),r.classList.toggle("uk-hidden",k!==4&&k!==5),l.classList.toggle("uk-hidden",k!==1)};p(t.SiteType),s.addEventListener("change",()=>p(parseInt(s.value))),document.getElementById("edit-site-form").addEventListener("submit",async k=>{k.preventDefault();let v=k.target.querySelector('[type="submit"]'),b=v.innerHTML;v.disabled=!0,v.innerHTML='<div uk-spinner="ratio: 0.6"></div> Saving...';let u=new FormData(k.target),m=parseInt(u.get("site_type")),g=null;m===4&&(g=parseInt(u.get("node_version"))),m===5&&(g=parseInt(u.get("dotnet_version")));let f={name:u.get("name").trim(),php_version:parseInt(u.get("php_version"))||3,site_type:m,runtime_version:g,start_command:u.get("start_command")?.trim()||""},y=m===1?u.get("install_wordpress")==="on":!1;try{if(await d.put(`/sites/${t.ID}`,f),a.hide(),document.getElementById("kp-edit-site-modal")?.remove(),m!==6){S("Applying Changes","Saving changes and recreating pod...");try{await d.post(`/sites/${t.ID}/recreate`,{install_wordpress:y}),w(),c.success("Site updated and pod recreated")}catch(x){w(),c.error("Site saved but pod recreate failed: "+x.message)}}else c.success("Site updated");h.go("site-detail",{id:String(t.ID)})}catch(x){c.error(x.message),v.disabled=!1,v.innerHTML=b}}),document.getElementById("kp-edit-site-modal").addEventListener("hidden",()=>document.getElementById("kp-edit-site-modal")?.remove())}function z(){document.body.insertAdjacentHTML("beforeend",`
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
        </div>`);let e=UIkit.modal("#kp-create-site-modal"),a=document.getElementById("cs-site-type"),s=document.getElementById("cs-php-version-wrap"),n=document.getElementById("cs-node-version-wrap"),i=document.getElementById("cs-dotnet-version-wrap"),o=document.getElementById("cs-start-command-wrap"),r=document.getElementById("cs-wordpress-wrap");e.show();let l=document.getElementById("cs-domains-wrap"),p=document.getElementById("cs-rp-note");a.addEventListener("change",()=>{let k=parseInt(a.value);s.classList.toggle("uk-hidden",k!==1&&k!==2||k===6),n.classList.toggle("uk-hidden",k!==4),i.classList.toggle("uk-hidden",k!==5),o.classList.toggle("uk-hidden",k!==4&&k!==5),r.classList.toggle("uk-hidden",k!==1||k===6),l.classList.toggle("uk-hidden",k===6),p.classList.toggle("uk-hidden",k!==6)}),document.getElementById("create-site-form").addEventListener("submit",async k=>{k.preventDefault();let v=k.target.querySelector('[type="submit"]'),b=v.innerHTML;v.disabled=!0,v.innerHTML='<div uk-spinner="ratio: 0.6"></div> Creating...';let u=new FormData(k.target),m=parseInt(u.get("site_type")),g=null;m===4&&(g=parseInt(u.get("node_version"))),m===5&&(g=parseInt(u.get("dotnet_version")));let f={name:u.get("name").trim(),php_version:parseInt(u.get("php_version"))||3,site_type:m,runtime_version:g,start_command:u.get("start_command")?.trim()||"",domains:u.get("domains").split(`
`).map(x=>x.trim()).filter(Boolean),install_wordpress:m===1?u.get("install_wordpress")==="on":!1};e.hide(),document.getElementById("kp-create-site-modal")?.remove();let y=m===6?`Setting up '${f.name}' as a reverse proxy...`:`Setting up '${f.name}' \u2014 pulling images and provisioning containers...`;S("Creating Site",y);try{await d.post("/sites",f),w(),c.success(`Site '${f.name}' created`),h.go("sites")}catch(x){w(),c.error(x.message),v.disabled=!1,v.innerHTML=b}}),document.getElementById("kp-create-site-modal").addEventListener("hidden",()=>document.getElementById("kp-create-site-modal")?.remove())}var V=null;function T(t){return t===0?"0 B":t<1024?`${t} B`:t<1048576?`${(t/1024).toFixed(1)} KB`:t<1073741824?`${(t/1048576).toFixed(1)} MB`:`${(t/1073741824).toFixed(2)} GB`}function Wt(t){return`${t.toFixed(1)}%`}var J=null;function st(){return J||(J=new Promise(t=>{if(window.Chart){t();return}let e=document.createElement("script");e.src="https://cdn.jsdelivr.net/npm/chart.js@latest/dist/chart.umd.min.js",e.onload=t,e.onerror=t,document.body.appendChild(e)}),J)}function nt(t,e){return`
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

        </div>`}async function Ot(t){await st();let e;try{e=await d.get(`/sites/${t}/stats/traffic`)}catch(i){document.getElementById("stats-ip-rows").innerHTML=`<tr><td colspan="2" class="kp-muted uk-text-small">Failed to load: ${i.message}</td></tr>`;return}document.getElementById("stats-2xx").textContent=(e.status_codes["2xx"]??0).toLocaleString(),document.getElementById("stats-3xx").textContent=(e.status_codes["3xx"]??0).toLocaleString(),document.getElementById("stats-4xx").textContent=(e.status_codes["4xx"]??0).toLocaleString(),document.getElementById("stats-5xx").textContent=(e.status_codes["5xx"]??0).toLocaleString(),document.getElementById("stats-bandwidth").textContent=T(e.total_bandwidth??0);let a=document.getElementById("stats-chart");if(a&&window.Chart){let i=(e.hits_per_hour??[]).map(o=>new Date(o.hour).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}));V&&(V.destroy(),V=null),V=new window.Chart(a,{type:"bar",data:{labels:i,datasets:[{label:"2xx",data:(e.hits_per_hour??[]).map(o=>o["2xx"]),backgroundColor:"rgba(39,174,96,0.75)",borderColor:"rgba(39,174,96,1)",borderWidth:1,borderRadius:3},{label:"3xx",data:(e.hits_per_hour??[]).map(o=>o["3xx"]),backgroundColor:"rgba(43,142,255,0.75)",borderColor:"rgba(43,142,255,1)",borderWidth:1,borderRadius:3},{label:"4xx",data:(e.hits_per_hour??[]).map(o=>o["4xx"]),backgroundColor:"rgba(255,171,0,0.75)",borderColor:"rgba(255,171,0,1)",borderWidth:1,borderRadius:3},{label:"5xx",data:(e.hits_per_hour??[]).map(o=>o["5xx"]),backgroundColor:"rgba(235,59,90,0.75)",borderColor:"rgba(235,59,90,1)",borderWidth:1,borderRadius:3}]},options:{responsive:!0,maintainAspectRatio:!1,plugins:{legend:{display:!0,labels:{color:"#6b8cae",font:{size:11}},onHover:o=>{o.native.target.style.cursor="pointer"},onLeave:o=>{o.native.target.style.cursor="default"}},tooltip:{mode:"index",backgroundColor:"#0c1530",borderColor:"#1a2a4a",borderWidth:1,titleColor:"#dde8f5",bodyColor:"#6b8cae"}},scales:{x:{stacked:!0,ticks:{color:"#6b8cae",font:{size:10},maxRotation:45},grid:{color:"rgba(26,42,74,0.6)"}},y:{stacked:!0,ticks:{color:"#6b8cae",font:{size:10}},grid:{color:"rgba(26,42,74,0.6)"},beginAtZero:!0}}}})}let s=document.getElementById("stats-ip-rows");s&&(s.innerHTML=(e.top_ips??[]).length===0?'<tr><td colspan="2" class="kp-muted uk-text-small">No data</td></tr>':(e.top_ips??[]).map(i=>`
                <tr>
                    <td class="kp-stats-table-cell-mono">${i.name}</td>
                    <td class="kp-stats-table-cell-count">${i.count.toLocaleString()}</td>
                </tr>`).join(""));let n=document.getElementById("stats-ua-rows");n&&(n.innerHTML=(e.top_uas??[]).length===0?'<tr><td colspan="2" class="kp-muted uk-text-small">No data</td></tr>':(e.top_uas??[]).map(i=>`
                <tr>
                    <td class="kp-stats-ua-cell" title="${i.name}">${i.name}</td>
                    <td class="kp-stats-table-cell-count">${i.count.toLocaleString()}</td>
                </tr>`).join(""))}async function dt(t){let e=document.getElementById("stats-disk-wrap");if(e){e.innerHTML='<div uk-spinner="ratio:0.8" style="color:var(--kp-blue)"></div>';try{let a=await d.get(`/sites/${t}/stats/disk`);e.innerHTML=`
            <div class="uk-grid-small uk-child-width-1-2" uk-grid>
                <div>
                    <div class="kp-stat-card" style="padding:16px">
                        <div class="kp-stat-value kp-stats-disk-val">${T(a.html_bytes??0)}</div>
                        <div class="kp-stat-label">Site Files</div>
                    </div>
                </div>
                <div>
                    <div class="kp-stat-card" style="padding:16px">
                        <div class="kp-stat-value kp-stats-disk-val">${T(a.db_bytes??0)}</div>
                        <div class="kp-stat-label">Database</div>
                    </div>
                </div>
            </div>`}catch(a){e.innerHTML=`<p class="kp-muted uk-text-small">Failed to load disk usage: ${a.message}</p>`}}}function zt(t){return!t||t.length===0?'<p class="kp-muted uk-text-small uk-margin-remove">No container data.</p>':`
        <table class="uk-table uk-table-small uk-table-divider uk-margin-remove">
            <thead><tr>
                <th style="color:var(--kp-text-dim);font-size:0.75rem">Container</th>
                <th style="color:var(--kp-text-dim);font-size:0.75rem">CPU</th>
                <th style="color:var(--kp-text-dim);font-size:0.75rem">Memory</th>
                <th style="color:var(--kp-text-dim);font-size:0.75rem">Mem %</th>
            </tr></thead>
            <tbody>${t.map(a=>{let s=a.mem_limit>0?(a.mem_used/a.mem_limit*100).toFixed(1):0,n=s>80;return`
            <tr>
                <td class="kp-stats-pod-role">${a.name.split("-").pop()}</td>
                <td class="kp-stats-pod-cpu${a.cpu_percent>80?" is-hot":""}">
                    ${Wt(a.cpu_percent)}
                </td>
                <td class="kp-stats-pod-mem">
                    ${T(a.mem_used)}
                    <span class="kp-stats-pod-mem-limit"> / ${T(a.mem_limit)}</span>
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
        </table>`}function pt(t,e,a){let s=a===6,n=null;function i(){if(s)return;let l=t.querySelector("#stats-pod-indicator"),p=t.querySelector("#stats-pod-table-wrap");if(!p)return;let k=location.protocol==="https:"?"wss":"ws";n=new WebSocket(`${k}://${location.host}/api/sites/${e}/stats/pod`),n.onopen=()=>{l&&(l.className="kp-status kp-status-running",l.textContent="Live")},n.onmessage=v=>{try{let b=JSON.parse(v.data);p.innerHTML=zt(b.containers??[])}catch{}},n.onerror=()=>{l&&(l.className="kp-status kp-status-error",l.textContent="Error")},n.onclose=()=>{l&&l.textContent==="Live"&&(l.className="kp-status kp-status-stopped",l.textContent="Disconnected")}}function o(){n&&n.readyState===WebSocket.OPEN&&n.close(),n=null}t.querySelector("#stats-disk-refresh")?.addEventListener("click",()=>{dt(e)}),i();let r=new MutationObserver(()=>{document.getElementById("stats-panel")||(o(),r.disconnect())});r.observe(document.getElementById("main")??document.body,{childList:!0,subtree:!1})}async function ut(t,e){let a=e===6;await Ot(t),a||await dt(t)}async function kt(t){let e=await d.get("/sites")??[];t.innerHTML=`
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

        ${e.length===0?j("world","No sites yet \u2014 create one to get started"):`<div class="kp-table-wrap">
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
                            ${e.map(a=>Vt(a,e)).join("")}
                        </tbody>
                    </table>
                </div>
            </div>`}`,document.getElementById("sites-new-btn").addEventListener("click",()=>z()),Jt()}function Vt(t,e=[]){let a=t.Domains?.[0]??null,s=t.SiteType===6,n=t.ParentID>0?e.find(i=>i.ID===t.ParentID)??null:null;return`
        <tr data-site-id="${t.ID}" data-status="${t.SiteStatus}" data-type="${t.SiteType}">
            <!-- row checkbox -->
            <td class="uk-table-shrink">
                <input class="uk-checkbox kp-site-row-check" type="checkbox"
                       data-site-id="${t.ID}" data-site-type="${t.SiteType}">
            </td>
            <!-- status badge -->
            <td class="uk-table-shrink kp-site-row-status">${s?"":P(t.SiteStatus)}</td>

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
                ${_(t.SiteType)}${I(t)?" / "+I(t):""}
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
        </tr>`}function mt(t,e=[]){let a=t.Domains?.[0]??null,s=t.SiteType===6,n=t.ParentID>0?e.find(i=>i.ID===t.ParentID)??null:null;return`
        <div class="kp-site-card" data-site-id="${t.ID}" data-status="${t.SiteStatus}" data-type="${t.SiteType}">
            <div class="kp-site-card-header">
                <div>
                    <h2 class="kp-view-title" data-action="manage" data-id="${t.ID}">${t.Name}</h2>
                    <div class="kp-site-meta">
                        <span class="kp-site-meta-item"><span uk-icon="icon: server; ratio: 0.75"></span> :${t.Port}</span>
                        <span class="kp-site-meta-item"><span uk-icon="icon: code; ratio: 0.75"></span> ${_(t.SiteType)}${I(t)?" / "+I(t):""}</span>
                        ${a?`<span class="kp-site-meta-item" style="width:100%"><a href="http://${a}" target="_blank" style="color:var(--kp-cyan)">${a}</a></span>`:""}
                    </div>
                    ${n?`<div class="kp-site-meta kp-muted uk-text-small uk-margin-small-top"><span uk-icon="icon: git-fork; ratio: 0.75"></span> <a href="javascript:void(0)" data-action="manage" data-id="${n.ID}" style="color:var(--kp-cyan)">${n.Name}</a></div>`:""}
                </div>
                ${s?"":P(t.SiteStatus)}
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
        </div>`}function Jt(){let t=document.getElementById("sites-bulk-bar"),e=document.getElementById("sites-bulk-count"),a=document.getElementById("sites-select-all"),s=document.getElementById("sites-search"),n=document.querySelector(".kp-table-wrap tbody");if(!t||!a)return;let i=null,o=!0,r=()=>[...document.querySelectorAll(".kp-site-row-check:checked")],l=()=>{let m=r().length;e.textContent=`${m} selected`,["bulk-start","bulk-stop","bulk-restart","bulk-flush"].forEach(y=>{let x=document.getElementById(y);x&&(x.disabled=m===0)});let g=document.getElementById("kp-bulk-mobile-btn");g&&(g.disabled=m===0);let f=document.querySelectorAll(".kp-site-row-check");a.indeterminate=m>0&&m<f.length,a.checked=f.length>0&&m===f.length},p=()=>{let u=s.value.trim().toLowerCase();document.querySelectorAll(".kp-table-wrap tbody tr").forEach(m=>{let g=m.querySelector(".kp-site-row-name")?.textContent.toLowerCase()??"",f=m.querySelector("td:nth-child(6)")?.textContent.toLowerCase()??"";m.style.display=!u||g.includes(u)||f.includes(u)?"":"none"})},k=u=>{i===u?o=!o:(i=u,o=!0),document.querySelectorAll(".kp-sort-icon").forEach(g=>{g.textContent=g.dataset.col===u?o?" \u2191":" \u2193":" \u2195"});let m=[...n.querySelectorAll("tr")];m.sort((g,f)=>{let y="",x="";return u==="name"?(y=g.querySelector(".kp-site-row-name")?.textContent??"",x=f.querySelector(".kp-site-row-name")?.textContent??""):u==="status"?(y=g.dataset.status??"",x=f.dataset.status??""):u==="type"?(y=g.dataset.type??"",x=f.dataset.type??""):u==="domain"&&(y=g.querySelector("td:nth-child(6)")?.textContent.trim()??"",x=f.querySelector("td:nth-child(6)")?.textContent.trim()??""),o?y.localeCompare(x):x.localeCompare(y)}),m.forEach(g=>n.appendChild(g))};a.addEventListener("change",()=>{document.querySelectorAll(".kp-site-row-check").forEach(u=>{u.checked=a.checked}),l()}),n?.addEventListener("change",u=>{u.target.classList.contains("kp-site-row-check")&&l()}),s?.addEventListener("input",p),document.querySelectorAll(".kp-sortable").forEach(u=>{u.addEventListener("click",()=>k(u.dataset.col))}),["bulk-start","bulk-stop","bulk-restart","bulk-flush"].forEach(u=>{let m=u.replace("bulk-","");document.getElementById(u)?.addEventListener("click",()=>{let g=r().map(f=>f.dataset.siteId);document.dispatchEvent(new CustomEvent("kp:bulk-action",{detail:{action:m,ids:g}}))})});let v=document.getElementById("kp-bulk-mobile-pill"),b=document.getElementById("kp-bulk-mobile-dropdown");document.getElementById("kp-bulk-mobile-btn")?.addEventListener("click",u=>{u.stopPropagation(),b.hidden=!b.hidden}),document.addEventListener("click",u=>{b&&!v?.contains(u.target)&&(b.hidden=!0)},{capture:!0}),["start","stop","restart","flush"].forEach(u=>{document.getElementById(`bulk-mobile-${u}`)?.addEventListener("click",m=>{m.preventDefault(),b.hidden=!0;let g=r().map(f=>f.dataset.siteId);document.dispatchEvent(new CustomEvent("kp:bulk-action",{detail:{action:u,ids:g}}))})}),document.querySelectorAll(".kp-sort-icon").forEach(u=>{u.textContent=" \u2195"}),l()}var K=null;async function bt(t){let[e,a,s]=await Promise.all([d.get("/sites").catch(()=>[]),d.get("/stats/traffic").catch(()=>null),d.get("/stats/pod").catch(()=>null)]),n=e.filter(r=>r.SiteStatus===1).length,i=e.filter(r=>r.SiteStatus===2).length,o=e.filter(r=>r.SiteStatus===4).length;if(t.innerHTML=`
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
                            <div class="kp-stat-value" style="color:var(--kp-danger)">${o}</div>
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
                    ${T(a?.total_bandwidth??0)}
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
                                <div class="kp-stat-value">${T(s?.mem_used??0)}</div>
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
                            ${(a?.top_sites??[]).length===0?'<tr><td colspan="2" class="kp-muted uk-text-small">No traffic data</td></tr>':(a?.top_sites??[]).map(r=>`
                                    <tr>
                                        <td class="kp-mono" style="font-size:0.8rem">${r.name}</td>
                                        <td style="text-align:right;color:var(--kp-cyan);
                                            font-family:'JetBrains Mono',monospace;font-size:0.8rem">
                                            ${r.count.toLocaleString()}
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
            ${e.length===0?j("world","No sites yet"):e.slice(-3).reverse().map(r=>mt(r,e)).join("")}
        </div>`,a?.hits_per_hour?.length){await st();let r=document.getElementById("dash-traffic-chart");r&&window.Chart&&(K&&(K.destroy(),K=null),K=new window.Chart(r,{type:"bar",data:{labels:a.hits_per_hour.map(l=>new Date(l.hour).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})),datasets:[{label:"2xx",data:a.hits_per_hour.map(l=>l["2xx"]),backgroundColor:"rgba(39,174,96,0.75)",borderColor:"rgba(39,174,96,1)",borderWidth:1,borderRadius:3},{label:"3xx",data:a.hits_per_hour.map(l=>l["3xx"]),backgroundColor:"rgba(43,142,255,0.75)",borderColor:"rgba(43,142,255,1)",borderWidth:1,borderRadius:3},{label:"4xx",data:a.hits_per_hour.map(l=>l["4xx"]),backgroundColor:"rgba(255,171,0,0.75)",borderColor:"rgba(255,171,0,1)",borderWidth:1,borderRadius:3},{label:"5xx",data:a.hits_per_hour.map(l=>l["5xx"]),backgroundColor:"rgba(235,59,90,0.75)",borderColor:"rgba(235,59,90,1)",borderWidth:1,borderRadius:3}]},options:{responsive:!0,maintainAspectRatio:!1,plugins:{legend:{display:!0,labels:{color:"#6b8cae",font:{size:11}},onHover:l=>{l.native.target.style.cursor="pointer"},onLeave:l=>{l.native.target.style.cursor="default"}},tooltip:{mode:"index",backgroundColor:"#0c1530",borderColor:"#1a2a4a",borderWidth:1,titleColor:"#dde8f5",bodyColor:"#6b8cae"}},scales:{x:{stacked:!0,ticks:{color:"#6b8cae",font:{size:10},maxRotation:45},grid:{color:"rgba(26,42,74,0.6)"}},y:{stacked:!0,ticks:{color:"#6b8cae",font:{size:10}},grid:{color:"rgba(26,42,74,0.6)"},beginAtZero:!0}}}}))}document.getElementById("dash-new-site")?.addEventListener("click",()=>z())}function M(t=null){let e=t?`/sites/${t}/security/ip`:"/security/ip",a=t?`/sites/${t}/security/ua`:"/security/ua",s=t?`/sites/${t}/waf`:"/settings/waf";return`
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
            <div class="kp-card uk-padding-small uk-margin-bottom">
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
                <textarea class="uk-textarea kp-textarea kp-mono" id="sec-tp-cidrs" rows="15"
                    placeholder="192.168.1.0/24"></textarea>
                <p class="kp-muted uk-text-small uk-margin-small-top">
                    One IPv4 or IPv6 CIDR per line. Auto-fetched provider ranges are
                    managed automatically and do not need to be entered here.
                </p>
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

        </div>`}async function C(t){let e=t.querySelector("#security-panel");if(!e)return;let a=e.dataset.ipBase,s=e.dataset.uaBase,n=e.dataset.wafBase;try{let i=[d.get(a),d.get(s)];e.dataset.siteId||i.push(d.get(n),d.get("/settings/trusted-proxies"));let[o,r,l,p]=await Promise.all(i);if(!t.querySelector("#sec-ip-whitelist"))return;if(t.querySelector("#sec-ip-whitelist").value=o.whitelist??"",t.querySelector("#sec-ip-blacklist").value=o.blacklist??"",t.querySelector("#sec-ua-whitelist").value=r.whitelist??"",t.querySelector("#sec-ua-blacklist").value=r.blacklist??"",l){let k=t.querySelector("#sec-waf-enabled"),v=t.querySelector("#sec-waf-audit"),b=t.querySelector("#sec-waf-mode"),u=t.querySelector("#sec-waf-paranoia"),m=t.querySelector("#sec-waf-exclusions");k&&(k.checked=!!l.Enabled),v&&(v.checked=!!l.AuditLog),b&&(b.value=String(l.Mode??0)),u&&(u.value=String(l.ParanoiaLevel??1)),m&&(m.value=l.Exclusions??"")}if(p){let k=t.querySelector("#sec-tp-cidrs");k&&(k.value=p.trusted_proxies_custom??"")}}catch(i){c.error("Failed to load security rules: "+i.message)}}function G(t){let e=t.querySelector("#security-panel");if(!e)return;let a=e.dataset.ipBase,s=e.dataset.uaBase;t.querySelector("#sec-ip-save")?.addEventListener("click",async()=>{let n=t.querySelector("#sec-ip-save"),i=n.innerHTML;n.disabled=!0,n.innerHTML='<div uk-spinner="ratio: 0.5"></div>';try{await d.put(a,{whitelist:t.querySelector("#sec-ip-whitelist").value,blacklist:t.querySelector("#sec-ip-blacklist").value}),c.success("IP rules saved")}catch(o){c.error(o.message)}finally{n.disabled=!1,n.innerHTML=i}}),t.querySelector("#sec-ua-save")?.addEventListener("click",async()=>{let n=t.querySelector("#sec-ua-save"),i=n.innerHTML;n.disabled=!0,n.innerHTML='<div uk-spinner="ratio: 0.5"></div>';try{await d.put(s,{whitelist:t.querySelector("#sec-ua-whitelist").value,blacklist:t.querySelector("#sec-ua-blacklist").value}),c.success("UA rules saved")}catch(o){c.error(o.message)}finally{n.disabled=!1,n.innerHTML=i}}),t.querySelector("#sec-tp-save")?.addEventListener("click",async()=>{let n=t.querySelector("#sec-tp-save"),i=n.innerHTML;n.disabled=!0,n.innerHTML='<div uk-spinner="ratio: 0.5"></div>';try{await d.put("/settings/trusted-proxies",{trusted_proxies_custom:t.querySelector("#sec-tp-cidrs").value.trim()}),c.success("Trusted proxy ranges saved")}catch(o){c.error(o.message)}finally{n.disabled=!1,n.innerHTML=i}}),t.querySelector("#sec-tp-import")?.addEventListener("change",async n=>{let i=n.target.files[0];if(!i)return;let o=new FormData;o.append("file",i);try{let r=await fetch("/api/settings/trusted-proxies/import",{method:"POST",body:o}),l=r.status===204?null:await r.json().catch(()=>null);if(!r.ok)throw new Error(l?.error||`HTTP ${r.status}`);await C(t),c.success("Trusted proxies imported")}catch(r){c.error(r.message)}finally{n.target.value=""}}),t.querySelector("#sec-waf-save")?.addEventListener("click",async()=>{let n=t.querySelector("#sec-waf-save"),i=n.innerHTML;n.disabled=!0,n.innerHTML='<div uk-spinner="ratio: 0.5"></div>';try{await d.put(e.dataset.wafBase,{enabled:t.querySelector("#sec-waf-enabled").checked,mode:parseInt(t.querySelector("#sec-waf-mode").value,10),paranoia_level:parseInt(t.querySelector("#sec-waf-paranoia").value,10),audit_log:t.querySelector("#sec-waf-audit").checked,exclusions:t.querySelector("#sec-waf-exclusions").value.trim()}),c.success("WAF settings saved \u2014 engine recompiling in background")}catch(o){c.error(o.message)}finally{n.disabled=!1,n.innerHTML=i}}),t.querySelector("#sec-ip-import")?.addEventListener("change",async n=>{let i=n.target.files[0];if(!i)return;let o=new FormData;o.append("file",i);try{let r=await fetch("/api"+a+"/import",{method:"POST",body:o}),l=r.status===204?null:await r.json().catch(()=>null);if(!r.ok)throw new Error(l?.error||`HTTP ${r.status}`);await C(t),c.success("IP rules imported")}catch(r){c.error(r.message)}finally{n.target.value=""}}),t.querySelector("#sec-ua-import")?.addEventListener("change",async n=>{let i=n.target.files[0];if(!i)return;let o=new FormData;o.append("file",i);try{let r=await fetch("/api"+s+"/import",{method:"POST",body:o}),l=r.status===204?null:await r.json().catch(()=>null);if(!r.ok)throw new Error(l?.error||`HTTP ${r.status}`);await C(t),c.success("UA rules imported")}catch(r){c.error(r.message)}finally{n.target.value=""}}),t.querySelector("#sec-waf-import")?.addEventListener("change",async n=>{let i=n.target.files[0];if(!i)return;let o=new FormData;o.append("file",i);try{let r=await fetch("/api/settings/waf/import",{method:"POST",body:o}),l=r.status===204?null:await r.json().catch(()=>null);if(!r.ok)throw new Error(l?.error||`HTTP ${r.status}`);await C(t),c.success("WAF settings imported")}catch(r){c.error(r.message)}finally{n.target.value=""}})}async function vt(t){if(!D()){t.innerHTML=L("Access denied");return}t.innerHTML=`
        <div class="kp-view-header">
            <h1 class="kp-view-title kp-cursor" style="font-size:2rem;">Global Security</h1>
        </div>
        <p class="kp-muted uk-text-small uk-margin-bottom">
            Global rules apply to all sites before per-site rules are evaluated.
            Blacklist always wins \u2014 a blacklisted entry cannot be overridden by any whitelist.
        </p>
        ${M(null)}`,G(t),C(t)}function Kt(t){switch(t){case"valid":case"self-signed":return'<span class="kp-ssl-valid" uk-icon="icon: lock; ratio: 0.85" uk-tooltip="Valid SSL certificate"></span>';default:return'<span class="kp-ssl-none" uk-icon="icon: warning; ratio: 0.85" uk-tooltip="No SSL certificate"></span>'}}async function gt(t){let e=document.getElementById("admin-domain-ssl");if(!(!e||!t))try{let a=await d.get(`/ssl-status?domain=${encodeURIComponent(t)}`);e.outerHTML=Kt(a.status)}catch{}}async function ht(t){if(!D()){t.innerHTML=L("Access denied");return}let[e,a,s,n]=await Promise.all([d.get("/settings"),d.get("/settings/backup"),d.get("/settings/waf"),d.get("/settings/trusted-proxies")]);t.innerHTML=`
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
        <div class="uk-width-1-1">
            <!-- leaving this here for future settings sections -->
        </div>
    </div>
    `,e.admin_domain&&gt(e.admin_domain),document.getElementById("settings-form").addEventListener("submit",async i=>{i.preventDefault();let o=i.target.querySelector('[type="submit"]'),r=o.innerHTML;o.disabled=!0,o.innerHTML='<div uk-spinner="ratio: 0.6"></div> Saving...';let p={admin_domain:new FormData(i.target).get("admin_domain").trim()};try{await d.put("/settings",p),c.success("Settings saved"),gt(p.admin_domain)}catch(k){c.error(k.message)}finally{o.disabled=!1,o.innerHTML=r}}),document.getElementById("settings-import").addEventListener("change",async i=>{let o=i.target.files[0];if(!o)return;let r=new FormData;r.append("file",o);try{let l=await fetch("/api/settings/import",{method:"POST",body:r}),p=l.status===204?null:await l.json().catch(()=>null);if(!l.ok)throw new Error(p?.error||`HTTP ${l.status}`);c.success("Settings imported")}catch(l){c.error(l.message)}finally{i.target.value=""}}),document.getElementById("backup-form").addEventListener("submit",async i=>{i.preventDefault();let o=i.target.querySelector('[type="submit"]'),r=o.innerHTML;o.disabled=!0,o.innerHTML='<div uk-spinner="ratio: 0.6"></div> Saving...';let l=new FormData(i.target),p={backup_schedule:l.get("backup_schedule").trim(),backup_retain_days:l.get("backup_retain_days").trim()};try{await d.put("/settings/backup",p),c.success("Backup settings saved")}catch(k){c.error(k.message)}finally{o.disabled=!1,o.innerHTML=r}}),document.getElementById("s3-form").addEventListener("submit",async i=>{i.preventDefault();let o=i.target.querySelector('[type="submit"]'),r=o.innerHTML;o.disabled=!0,o.innerHTML='<div uk-spinner="ratio: 0.6"></div> Saving...';let l=new FormData(i.target),p={s3_endpoint:l.get("s3_endpoint").trim(),s3_bucket:l.get("s3_bucket").trim(),s3_region:l.get("s3_region").trim(),s3_access_key:l.get("s3_access_key").trim()},k=l.get("s3_secret_key").trim();k&&(p.s3_secret_key=k);try{await d.put("/settings/backup",p),c.success("S3 settings saved")}catch(v){c.error(v.message)}finally{o.disabled=!1,o.innerHTML=r}})}function ft(t){return`
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
                    <button class="uk-button kp-btn-primary kp-btn-sm" id="backup-run-btn" uk-tooltip="Run a Manual Backup">
                        <span uk-icon="cloud-upload"></span>
                    </button>
                </div>
                <div id="backup-error-banner"></div>
                <div id="backup-list-wrap">
                    <div uk-spinner="ratio: 0.8" style="color:var(--kp-blue)"></div>
                </div>
            </div>

        </div>`}function Gt(t){if(!t||t.length===0)return'<p class="kp-muted uk-text-small uk-margin-remove">No snapshots yet.</p>';let e=n=>n===2?'<span class="kp-mono" style="color:var(--kp-cyan)">S3</span>':'<span class="kp-mono" style="color:var(--kp-blue)">Local</span>',a=n=>n<1024?`${n} B`:n<1048576?`${(n/1024).toFixed(1)} KB`:n<1073741824?`${(n/1048576).toFixed(1)} MB`:`${(n/1073741824).toFixed(2)} GB`;return`
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
        </table>`}async function R(t,e){try{let[a,s]=await Promise.all([d.get(`/sites/${e}/backup-repo`),d.get(`/sites/${e}/backups`)]),n=t.querySelector("#backup-local-enabled"),i=t.querySelector("#backup-s3-enabled");n&&(n.checked=!!a.LocalEnabled),i&&(i.checked=!!a.S3Enabled);let o=t.querySelector("#backup-error-banner");if(o)if(a.last_error){let l=a.last_error_at?` (${new Date(a.last_error_at).toLocaleString()})`:"";o.innerHTML=`
                    <div uk-alert class="uk-alert-warning">
                        <a class="uk-alert-close" uk-close></a>
                        <p><strong>Last scheduled backup failed${l}:</strong> ${a.last_error}</p>
                    </div>`}else o.innerHTML="";let r=t.querySelector("#backup-list-wrap");r&&(r.innerHTML=Gt(s))}catch(a){let s=t.querySelector("#backup-list-wrap");s&&(s.innerHTML=`<p class="kp-muted uk-text-small">Failed to load backups: ${a.message}</p>`)}}function yt(t,e){t.querySelector("#backup-repo-save")?.addEventListener("click",async()=>{let a={local_enabled:t.querySelector("#backup-local-enabled")?.checked??!1,s3_enabled:t.querySelector("#backup-s3-enabled")?.checked??!1};try{await d.put(`/sites/${e}/backup-repo`,a),c.success("Backup destinations saved")}catch(s){c.error(s.message)}}),t.querySelector("#backup-run-btn")?.addEventListener("click",async()=>{let a=0;try{a=(await d.get(`/sites/${e}/backups`))?.length??0}catch{}try{await d.post(`/sites/${e}/backups`,{label:"manual"})}catch(i){c.error(i.message);return}S("Backup Running","Snapshotting files and database \u2014 this may take a few minutes.");let s=Date.now()+1800*1e3,n=setInterval(async()=>{try{(((await d.get(`/sites/${e}/backups`))?.length??0)>a||Date.now()>s)&&(clearInterval(n),w(),await R(t,e),Date.now()<=s?c.success("Backup complete"):c.error("Backup is taking longer than expected \u2014 check server logs for status"))}catch{}},4e3)}),t.querySelector("#backup-list-wrap")?.addEventListener("click",async a=>{let s=a.target.closest(".backup-restore-btn");if(s){let o=s.dataset.id;if(!await $("Restore Site","This will restore the site from the selected snapshot. The site will show a maintenance page during the restore. Continue?"))return;try{await d.post(`/sites/${e}/backups/${o}/restore`)}catch(v){c.error(v.message);return}S("Restore Running","Restoring files and database \u2014 the site will return automatically when complete.");let l=Date.now(),p=Date.now()+900*1e3,k=setInterval(async()=>{try{let v=await d.get(`/sites/${e}/backups/restore-status`);(!v?.active||Date.now()>p)&&(clearInterval(k),w(),v?.active?c.error("Restore timed out"):c.success("Restore complete"),await R(t,e))}catch{}},3e3);return}let n=a.target.closest(".backup-delete-btn");if(n){let o=n.dataset.id;if(!await $("Delete Snapshot","This will permanently remove the snapshot from all configured repositories. This cannot be undone."))return;S("Deleting Snapshot","Removing snapshot data from repositories \u2014 this may take a moment.");try{await d.delete(`/sites/${e}/backups/${o}`),w(),c.success("Snapshot deleted"),await R(t,e)}catch(l){w(),c.error(l.message)}}let i=a.target.closest(".backup-download-btn");if(i){let o=i.dataset.id;S("Preparing Download","Your backup archive is being generated \u2014 this may take a moment depending on site size. Your download will begin automatically. Do not close this tab."),setTimeout(()=>{let r=document.createElement("a");r.href=`/api/sites/${e}/backups/${o}/download`,r.style.display="none",document.body.appendChild(r),r.click(),document.body.removeChild(r),setTimeout(()=>{w()},5e3)},300);return}})}var H={1:"Nginx",2:"PHP",3:"MariaDB",4:"Redis",5:"Varnish"};function N(t,e,a){let s=a?Object.entries(a):[];return`
        <div>
            <div class="uk-flex uk-flex-between uk-flex-middle uk-margin-small-bottom">
                <div class="uk-flex uk-flex-middle" style="gap:10px">
                    <h4 class="kp-view-title uk-margin-remove">${H[e]}</h4>
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
                ${s.map(([n,i])=>A(n,i)).join("")}
            </div>
        </div>`}function wt(t,e){let a=e?.enabled==="true",s=e?Object.entries(e).filter(([n])=>n!=="enabled"):[];return`
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
                ${s.map(([n,i])=>A(n,i)).join("")}
            </div>
        </div>`}function A(t="",e=""){return`<div class="kp-config-row">
        <div class="kp-config-key">
            <input class="cfg-key" type="text" value="${t}" placeholder="key">
        </div>
        <div class="kp-config-val">
            <input class="cfg-val" type="text" value="${e}" placeholder="value">
        </div>
        <button class="kp-config-del cfg-del-row" title="Remove">
            <span uk-icon="icon: close; ratio: 0.8"></span>
        </button>
    </div>`}function xt(t,e){t.addEventListener("click",a=>{if(a.target.closest(".cfg-add-row")){let s=a.target.closest(".cfg-add-row");t.querySelector(`.cfg-rows[data-type="${s.dataset.type}"]`).insertAdjacentHTML("beforeend",A())}}),t.addEventListener("click",a=>{a.target.closest(".cfg-del-row")&&a.target.closest(".kp-config-row").remove()}),t.addEventListener("click",async a=>{let s=a.target.closest(".cfg-save");if(!s)return;let{type:n,site:i}=s.dataset,o=t.querySelectorAll(`.cfg-rows[data-type="${n}"] .kp-config-row`),r={};if(o.forEach(l=>{let p=l.querySelector(".cfg-key").value.trim(),k=l.querySelector(".cfg-val").value.trim();p&&(r[p]=k)}),n==="5"){let l=t.querySelector(".varnish-enabled-toggle");r.enabled=l?.checked?"true":"false"}try{await d.put(`/sites/${i}/configs/${n}`,r),c.success(`${H[n]} config saved`)}catch(l){c.error(l.message)}}),t.addEventListener("click",async a=>{let s=a.target.closest(".cfg-reset");if(!s)return;let{type:n,site:i}=s.dataset;if(await $("Reset Config",`Reset ${H[n]} config to defaults?`))try{let r=await d.post(`/sites/${i}/configs/${n}/reset`),l=t.querySelector(`.cfg-rows[data-type="${n}"]`);l.innerHTML=Object.entries(r).map(([p,k])=>A(p,k)).join(""),c.success(`${H[n]} reset to defaults`)}catch(r){c.error(r.message)}}),t.addEventListener("change",async a=>{let s=a.target.closest(".cfg-import-input");if(!s)return;let{type:n,site:i}=s.dataset,o=s.files[0];if(!o)return;let r=new FormData;r.append("file",o);try{let l=await fetch(`/api/sites/${i}/configs/${n}/import`,{method:"POST",body:r}),p=l.status===204?null:await l.json().catch(()=>null);if(!l.ok)throw new Error(p?.error||`HTTP ${l.status}`);let k=t.querySelector(`.cfg-rows[data-type="${n}"]`);k.innerHTML=Object.entries(p).map(([v,b])=>A(v,b)).join(""),c.success(`${H[n]} config imported`)}catch(l){c.error(l.message)}finally{s.value=""}})}function $t(t){return`
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

        </div>`}function Et(t){if(!t||t.length===0)return'<p class="kp-muted uk-text-small uk-margin-remove">No cron jobs configured.</p>';let e=s=>s?new Date(s).toLocaleString():"\u2014";return`
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
        </table>`}async function Q(t,e){let a=t.querySelector("#cron-list-wrap");if(a)try{let s=await d.get(`/sites/${e}/crons`);a.innerHTML=Et(s)}catch(s){a.innerHTML=`<p class="kp-muted uk-text-small">Failed to load cron jobs: ${s.message}</p>`}}function Lt(t,e){let a=[],s=t.querySelector("#cron-modal"),n=t.querySelector("#cron-modal-title"),i=t.querySelector("#cron-modal-id"),o=t.querySelector("#cron-modal-label"),r=t.querySelector("#cron-modal-command"),l=t.querySelector("#cron-modal-schedule"),p=t.querySelector("#cron-schedule-preview"),k=t.querySelector("#cron-modal-enabled");l?.addEventListener("input",()=>{p.textContent=St(l.value.trim())}),t.querySelector("#cron-add-btn")?.addEventListener("click",()=>{n.textContent="Add Cron Job",i.value="",o.value="",r.value="",l.value="",p.textContent="",k.checked=!0,UIkit.modal(s).show()}),t.querySelector("#cron-modal-save")?.addEventListener("click",async()=>{let v=r.value.trim(),b=l.value.trim();if(!v||!b){c.error("Command and schedule are required");return}let u={label:o.value.trim(),command:v,schedule:b,enabled:k.checked},m=i.value;try{m?(await d.put(`/sites/${e}/crons/${m}`,u),c.success("Cron job updated")):(await d.post(`/sites/${e}/crons`,u),c.success("Cron job created")),UIkit.modal(s).hide(),await Q(t,e),a=await d.get(`/sites/${e}/crons`)}catch(g){c.error(g.message)}}),t.querySelector("#cron-list-wrap")?.addEventListener("click",async v=>{let b=v.target.closest(".cron-detail-btn");if(b){let f=b.dataset.id,y=a.find(tt=>String(tt.ID)===f);if(!y)return;document.body.insertAdjacentHTML("beforeend",`
                <div id="cron-detail-modal" uk-modal>
                    <div class="uk-modal-dialog kp-modal uk-modal-body uk-width-large">
                        <button class="uk-modal-close-default" type="button" uk-close></button>
                        <h3 class="kp-view-title uk-margin-bottom">Run Details \u2014 ${it(y.Label||String(y.ID))}</h3>
                        <div class="uk-margin-small-bottom">
                            <label class="kp-label">Output</label>
                            <pre class="kp-cron-output">${it(y.LastOutput||"(no output)")}</pre>
                        </div>
                        <div class="uk-margin-small-top">
                            <label class="kp-label">Error</label>
                            <pre class="kp-cron-output kp-cron-output-error">${it(y.LastError||"(no error)")}</pre>
                        </div>
                    </div>
                </div>`);let x=document.getElementById("cron-detail-modal");UIkit.modal(x).show(),x.addEventListener("hidden",()=>x.remove(),{once:!0});return}let u=v.target.closest(".cron-edit-btn");if(u){let f=u.dataset.id,y=a.find(x=>String(x.ID)===f);if(!y)return;n.textContent="Edit Cron Job",i.value=y.ID,o.value=y.Label||"",r.value=y.Command,l.value=y.Schedule,p.textContent=St(y.Schedule),k.checked=y.Enabled,UIkit.modal(s).show();return}let m=v.target.closest(".cron-delete-btn");if(m){let f=m.dataset.id;if(!await $("Delete Cron Job","This will permanently remove the cron job. Continue?"))return;try{await d.delete(`/sites/${e}/crons/${f}`),c.success("Cron job deleted"),await Q(t,e),a=await d.get(`/sites/${e}/crons`)}catch(x){c.error(x.message)}return}let g=v.target.closest(".cron-run-btn");if(g){let f=g.dataset.id;try{await d.post(`/sites/${e}/crons/${f}/run`)}catch(E){c.error(E.message);return}S("Running Cron Job","Executing the job inside the container \u2014 please wait.");let y=null;try{y=(await d.get(`/sites/${e}/crons`)).find(B=>String(B.ID)===f)?.LastRun??null}catch{}let x=Date.now()+300*1e3,tt=setInterval(async()=>{try{let E=await d.get(`/sites/${e}/crons`),B=E.find(U=>String(U.ID)===f);if(!B||B.LastRun!==y||Date.now()>x){clearInterval(tt),w(),a=E??[];let U=t.querySelector("#cron-list-wrap");U&&(U.innerHTML=Et(E)),B?.LastError?c.error(`Job failed: ${B.LastError}`):c.success("Cron job complete")}}catch{}},2e3);return}}),t.querySelector("#cron-list-wrap")?.addEventListener("change",async v=>{let b=v.target.closest(".cron-toggle");if(!b)return;let u=b.dataset.id;try{await d.patch(`/sites/${e}/crons/${u}/toggle`,{enabled:b.checked}),c.success(b.checked?"Cron job enabled":"Cron job disabled")}catch(m){c.error(m.message),b.checked=!b.checked}}),d.get(`/sites/${e}/crons`).then(v=>{a=v??[]}).catch(()=>{})}function it(t){return String(t).replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}function St(t){if(!t)return"";let e=t.trim().split(/\s+/);if(e.length!==5)return"invalid expression";let[a,s,n,i,o]=e;if(t==="* * * * *")return"every minute";if(a!=="*"&&s!=="*"&&n==="*"&&i==="*"&&o==="*")return`daily at ${s.padStart(2,"0")}:${a.padStart(2,"0")}`;if(a!=="*"&&s!=="*"&&n==="*"&&i==="*"&&o!=="*"){let r=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];return`weekly on ${o.split(",").map(p=>r[parseInt(p)]??p).join(", ")} at ${s.padStart(2,"0")}:${a.padStart(2,"0")}`}return a.startsWith("*/")?`every ${a.slice(2)} minutes`:s.startsWith("*/")?`every ${s.slice(2)} hours`:t}var Qt=2e3;function ot(t,e){return`
        <div>
            <div class="kp-log-controls">
                <select class="uk-select kp-select" id="log-container" style="width:140px;height:38px">
                    ${e===6?'<option value="proxy">Proxy Log</option><option value="waf">WAF Log</option>':`<option value="nginx">Nginx</option>
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
        </div>`}function Tt(t,e){let a=null,s=!1,n=t.querySelector("#log-output"),i=t.querySelector("#log-connect"),o=t.querySelector("#log-disconnect"),r=t.querySelector("#log-clear"),l=t.querySelector("#log-autoscroll"),p=t.querySelector("#log-status");function k(u){for(u.split(`
`).forEach(m=>{if(!m)return;let g=document.createElement("div");g.className=m.match(/WAF BLOCK/i)?"kp-log-line-err":m.match(/WAF DETECT/i)?"kp-log-line-warn":m.match(/error|crit|emerg/i)?"kp-log-line-err":m.match(/warn/i)?"kp-log-line-warn":m.match(/info|notice/i)?"kp-log-line-info":"",g.textContent=m,n.appendChild(g)});n.childElementCount>Qt;)n.removeChild(n.firstChild);l.checked&&(n.scrollTop=n.scrollHeight)}function v(){a&&(a.close(),a=null),s=!1,i.disabled=!1,o.disabled=!0,p&&(p.textContent="Disconnected")}i.addEventListener("click",()=>{v();let u=t.querySelector("#log-container").value,m=t.querySelector("#log-tail").value,g=location.protocol==="https:"?"wss":"ws",f=u==="waf"?`${g}://${location.host}/api/sites/${e}/logs/waf?tail=${m}`:u==="proxy"?`${g}://${location.host}/api/sites/${e}/logs/proxy?tail=${m}`:`${g}://${location.host}/api/sites/${e}/logs?container=${u}&tail=${m}`;a=new WebSocket(f),a.onopen=()=>{s=!0,i.disabled=!0,o.disabled=!1,p&&(p.textContent=`Connected \u2014 ${u}`)},a.onmessage=y=>k(y.data),a.onerror=()=>{},a.onclose=()=>{s=!1,i.disabled=!1,o.disabled=!0,p&&(p.textContent="Disconnected")}}),o.addEventListener("click",v),r.addEventListener("click",()=>{n.innerHTML=""}),t.querySelector("#log-container").addEventListener("change",()=>{a&&a.readyState===WebSocket.OPEN&&(v(),i.click())});let b=h.go.bind(h);h.go=function(u,m={}){return a&&v(),b(u,m)}}function Yt(t){switch(t){case"valid":return'<span class="kp-ssl-valid" uk-icon="icon: lock; ratio: 0.85" uk-tooltip="Valid SSL certificate"></span>';case"self-signed":return'<span class="kp-ssl-self-signed" uk-icon="icon: lock; ratio: 0.85" uk-tooltip="Self-signed certificate"></span>';default:return'<span class="kp-ssl-none" uk-icon="icon: warning; ratio: 0.85" uk-tooltip="No SSL certificate"></span>'}}async function Ct(t,e){try{let a=await d.get(`/ssl-status?domain=${encodeURIComponent(t)}`),s=document.getElementById(`ssl-icon-${e}`);s&&(s.outerHTML=Yt(a.status))}catch{}}function Pt(t){t.forEach(e=>Ct(e.Domain,e.ID))}function It(t,e,a,s=0,n=null){let i=t.SiteType!==3&&t.PMAPort>0;return`
        <div class="uk-grid-medium" uk-grid>
            <div class="uk-width-1-2@m">
                <div class="kp-card uk-padding-small">
                    <h3 class="kp-view-title uk-margin-bottom">Site Info</h3>
                    <table class="uk-table uk-table-small uk-table-divider uk-margin-remove">
                        <tbody>
                            <tr><td class="kp-muted">Name</td><td>${t.Name}</td></tr>
                            ${n?`<tr><td class="kp-muted">Parent</td><td><a href="javascript:void(0)" data-action="manage" data-id="${s}" style="color:var(--kp-cyan)">${n}</a></td></tr>`:""}
                            <tr><td class="kp-muted">Internal Port</td><td>:${t.Port}</td></tr>
                            <tr><td class="kp-muted">Type</td><td>${_(t.SiteType)}</td></tr>
                            <tr><td class="kp-muted">Version</td><td>${I(t)}</td></tr>
                            <tr><td class="kp-muted">Status</td><td>${P(t.SiteStatus)}</td></tr>
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
                        ${e.length?e.map(Bt).join(""):'<p class="kp-muted uk-text-small">No domains configured</p>'}
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
        </div>`}function Bt(t){return`<div class="uk-flex uk-flex-between uk-flex-middle kp-config-row" data-domain-id="${t.ID}">
        <div class="uk-flex uk-flex-middle kp-domain-row-inner">
            <span id="ssl-icon-${t.ID}" class="kp-ssl-pending" uk-icon="icon: more; ratio: 0.85"></span>
            <span class="uk-text-small kp-mono">${t.Domain}</span>
        </div>
        <button class="kp-config-del" data-action="delete-domain" data-did="${t.ID}" title="Remove">
            <span uk-icon="icon: close; ratio: 0.8"></span>
        </button>
    </div>`}function Dt(t,e){t.querySelector("#domain-add-btn")?.addEventListener("click",()=>{t.querySelector("#domain-add-form").classList.remove("uk-hidden")}),t.querySelector("#domain-cancel-btn")?.addEventListener("click",()=>{t.querySelector("#domain-add-form").classList.add("uk-hidden")}),t.querySelector("#domain-save-btn")?.addEventListener("click",async()=>{let a=t.querySelector("#domain-add-input").value.trim();if(a)try{let s=await d.post(`/sites/${e}/domains`,{domain:a});t.querySelector("#domain-list").insertAdjacentHTML("beforeend",Bt(s)),Ct(s.Domain,s.ID),t.querySelector("#domain-add-form").classList.add("uk-hidden"),t.querySelector("#domain-add-input").value="",c.success("Domain added")}catch(s){c.error(s.message)}}),t.querySelector("#domain-list")?.addEventListener("click",async a=>{let s=a.target.closest('[data-action="delete-domain"]');if(!(!s||!await $("Remove Domain","Remove this domain from the site?")))try{await d.delete(`/sites/${e}/domains/${s.dataset.did}`),s.closest("[data-domain-id]").remove(),c.success("Domain removed")}catch(i){c.error(i.message)}})}function qt(t,e,a=null){t.querySelector("#sftp-regen-btn")?.addEventListener("click",async()=>{let s=t.querySelector("#sftp-regen-btn"),n=s.innerHTML;s.disabled=!0,s.innerHTML='<div uk-spinner="ratio: 0.5"></div>';try{await d.post(`/sites/${e}/sftp-regen`),c.success("SFTP password regenerated"),h.go("site-detail",{id:String(e)})}catch(i){c.error(i.message),s.disabled=!1,s.innerHTML=n}}),t.querySelector("#sftp-copy-btn")?.addEventListener("click",()=>{let s=t.querySelector("#sftp-pass-display")?.textContent;if(s)if(navigator.clipboard)navigator.clipboard.writeText(s).then(()=>c.success("Password copied to clipboard")).catch(()=>c.error("Failed to copy password"));else{let n=document.createElement("textarea");n.value=s,n.style.cssText="position:fixed;opacity:0",document.body.appendChild(n),n.select(),document.execCommand("copy"),document.body.removeChild(n),c.success("Password copied to clipboard")}}),t.querySelector("#pma-open-btn")?.addEventListener("click",async()=>{let s=t.querySelector("#pma-open-btn"),n=s.innerHTML;s.disabled=!0,s.innerHTML='<div uk-spinner="ratio: 0.5"></div> Opening...';try{let i=await d.post(`/sites/${e}/pma-token`);window.open(i.url,"_blank")}catch(i){c.error(i.message)}finally{s.disabled=!1,s.innerHTML=n}}),t.querySelector("#sync-pull-btn")?.addEventListener("click",async()=>{if(await et("pull",a.Name,t.querySelector('[data-action="manage"][data-id="'+a.ParentID+'"]')?.textContent?.trim()??"parent"))try{c.success("Pull from parent complete")}catch(n){c.error(n.message)}}),t.querySelector("#sync-push-btn")?.addEventListener("click",async()=>{if(await et("push",a.Name,t.querySelector('[data-action="manage"][data-id="'+a.ParentID+'"]')?.textContent?.trim()??"parent"))try{c.success("Push to parent complete")}catch(n){c.error(n.message)}})}var Xt=[{label:"Cache Flush",cmd:"cache flush"},{label:"Plugin List",cmd:"plugin list"},{label:"Theme List",cmd:"theme list"},{label:"User List",cmd:"user list"},{label:"Core Check",cmd:"core check-update"},{label:"Core Update",cmd:"core update"},{label:"Plugin Updates",cmd:"plugin update --all"},{label:"Theme Updates",cmd:"theme update --all"},{label:"Rewrite Flush",cmd:"rewrite flush"},{label:"Transient Delete",cmd:"transient delete --all"},{label:"Search Replace",cmd:"search-replace '' ''"}];function _t(t){return`
        <div>
            <div class="kp-log-controls" style="flex-wrap:wrap;gap:6px">
                ${Xt.map(e=>`
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
        </div>`}function Mt(t,e){let a=t.querySelector("#wpcli-output"),s=t.querySelector("#wpcli-input"),n=t.querySelector("#wpcli-run"),i=t.querySelector("#wpcli-clear"),o=t.querySelector("#wpcli-status"),r=[],l=-1;function p(b,u=""){b.split(`
`).forEach(m=>{if(!m)return;let g=document.createElement("div");u?g.className=u:g.className=m.match(/error|fatal|critical/i)?"kp-log-line-err":m.match(/warning|warn/i)?"kp-log-line-warn":m.match(/success|done\]/i)?"kp-log-line-info":"",g.textContent=m,a.appendChild(g)}),a.scrollTop=a.scrollHeight}function k(b){if(b=b.trim(),!b)return;r.unshift(b),l=-1,p(`wp> ${b}`,"kp-log-line-info"),s.disabled=!0,n.disabled=!0,o&&(o.textContent="Running...");let u=location.protocol==="https:"?"wss":"ws",m=new WebSocket(`${u}://${location.host}/api/sites/${e}/wpcli`);m.onopen=()=>{m.send(JSON.stringify({command:b}))},m.onmessage=g=>{let f=g.data;if(f.trim()==="[done]"){m.close();return}if(f.startsWith("[info]")){p(f,"kp-muted");return}if(f.startsWith("[error]")){p(f,"kp-log-line-err");return}p(f)},m.onerror=()=>{p("[error] WebSocket connection failed","kp-log-line-err")},m.onclose=()=>{s.disabled=!1,n.disabled=!1,o&&(o.textContent="Ready"),s.focus()}}n.addEventListener("click",()=>{k(s.value),s.value=""}),s.addEventListener("keydown",b=>{if(b.key==="Enter"){k(s.value),s.value="",l=-1;return}if(b.key==="ArrowUp"){b.preventDefault(),l<r.length-1&&(l++,s.value=r[l]);return}b.key==="ArrowDown"&&(b.preventDefault(),l>0?(l--,s.value=r[l]):(l=-1,s.value=""))}),t.querySelectorAll('[data-action="wpcli-quick"]').forEach(b=>{b.addEventListener("click",()=>{let u=b.dataset.cmd;if(u.startsWith("search-replace")){s.value=u,s.focus();let m=u.indexOf("''")+1;s.setSelectionRange(m,m);return}k(u)})}),i.addEventListener("click",()=>{a.innerHTML=""});let v=h.go.bind(h);h.go=function(b,u={}){return v(b,u)},s.focus()}var F=null;function Zt(){return`
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
        </div>`}function Rt(t){let e=t.querySelector("#kp-site-pills"),a=t.querySelector("#kp-site-switcher"),s=t.querySelector("#kp-manage-pill"),n=t.querySelector("#kp-manage-dropdown");if(!e||!a)return;function i(r,l=!1){UIkit.switcher(a).show(r),e.querySelectorAll(":scope > li[data-pill]").forEach(p=>p.classList.remove("kp-pill-active")),l?(s?.classList.add("kp-pill-active"),n?.querySelectorAll("a[data-switcher]").forEach(p=>{p.classList.toggle("kp-dd-active",parseInt(p.dataset.switcher,10)===r)})):(s?.classList.remove("kp-pill-active"),n?.querySelectorAll("a[data-switcher]").forEach(p=>p.classList.remove("kp-dd-active")))}e.querySelectorAll(":scope > li[data-pill] > a").forEach(r=>{r.addEventListener("click",l=>{l.preventDefault();let p=parseInt(r.closest("li").dataset.pill,10);i(p,!1)})}),s?.querySelector(".kp-pill-dropdown-btn")?.addEventListener("click",r=>{r.stopPropagation(),n.hidden=!n.hidden,s.classList.toggle("kp-pill-active",!n.hidden)}),n?.querySelectorAll("a[data-switcher]").forEach(r=>{r.addEventListener("click",l=>{l.preventDefault(),n.hidden=!0,i(parseInt(r.dataset.switcher,10),!0)})}),document.addEventListener("click",r=>{n&&!s.contains(r.target)&&(n.hidden=!0)},{capture:!0}),UIkit.switcher(a).show(0)}async function Ht(t){let e=document.getElementById("waf-tab-panel");if(!e)return;e.innerHTML=Zt();let a=document.getElementById("waf-export-btn");a&&(a.href=`/api/sites/${t}/waf/export`);try{let s=await d.get(`/sites/${t}/waf`),n=document.getElementById("waf-override"),i=document.getElementById("waf-site-exclusions");n&&(n.value=String(s.Override??0)),i&&(i.value=s.Exclusions??"");let o=document.getElementById("waf-plugins-list");if(o){let[r,l]=await Promise.all([d.get("/settings/waf/plugins"),d.get(`/sites/${t}/waf/plugins`)]),p=new Set(l??[]);!r||r.length===0?o.innerHTML='<span class="kp-muted uk-text-small">No plugins found in local CRS install.</span>':(o.innerHTML=`
                    <div class="waf-plugin-pills">
                        ${r.map(k=>`
                        <span class="waf-plugin-pill ${p.has(k)?"active":""}"
                            data-plugin="${k}">${k}</span>
                        `).join("")}
                    </div>`,o.querySelectorAll(".waf-plugin-pill").forEach(k=>{k.addEventListener("click",()=>k.classList.toggle("active"))}))}}catch(s){c.error("Failed to load WAF settings: "+s.message)}}function te(t,e){F&&F.abort(),F=new AbortController,t.addEventListener("submit",async a=>{if(a.target.id!=="waf-override-form")return;a.preventDefault();let s=a.target.querySelector('[type="submit"]'),n=s.innerHTML;s.disabled=!0,s.innerHTML='<div uk-spinner="ratio: 0.6"></div> Saving...';let i=new FormData(a.target),o={override:parseInt(i.get("override"),10),exclusions:i.get("exclusions").trim()};try{await d.put(`/sites/${e}/waf`,o);let r=[...document.querySelectorAll(".waf-plugin-pill.active")].map(l=>l.dataset.plugin);await d.put(`/sites/${e}/waf/plugins`,r),c.success("WAF override saved \u2014 engine recompiling in background")}catch(r){c.error(r.message)}finally{s.disabled=!1,s.innerHTML=n}},{signal:F.signal}),t.querySelector("#waf-import")?.addEventListener("change",async a=>{let s=a.target.files[0];if(!s)return;let n=new FormData;n.append("file",s);try{let i=await fetch(`/api/sites/${e}/waf/import`,{method:"POST",body:n}),o=i.status===204?null:await i.json().catch(()=>null);if(!i.ok)throw new Error(o?.error||`HTTP ${i.status}`);await Ht(e),c.success("WAF settings imported")}catch(i){c.error(i.message)}finally{a.target.value=""}})}function ee(){return`
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
        </div>`}function lt(t="",e=""){return`
        <div class="rp-route-row uk-flex uk-flex-middle uk-margin-small-bottom" style="gap:8px">
            <input class="uk-input kp-input" style="flex:1" placeholder="example.com" value="${t}" data-field="domain">
            <input class="uk-input kp-input" style="flex:2" placeholder="https://10.0.0.1:8080" value="${e}" data-field="upstream">
            <button class="uk-button kp-btn-ghost kp-btn-sm rp-remove-row" uk-tooltip="Remove"><span uk-icon="trash"></span></button>
        </div>`}async function ae(t){let e=document.getElementById("rp-routes-list");if(e)try{let a=await d.get(`/sites/${t}/rp-routes`);e.innerHTML=a.length?a.map(s=>lt(s.Domain,s.Upstream)).join(""):lt()}catch(a){c.error("Failed to load routes: "+a.message)}}function se(t,e){t.addEventListener("click",async a=>{if(a.target.closest("#rp-add-row")){document.getElementById("rp-routes-list").insertAdjacentHTML("beforeend",lt());return}if(a.target.closest(".rp-remove-row")){a.target.closest(".rp-route-row").remove();return}if(!a.target.closest("#rp-save-btn"))return;let s=a.target.closest("#rp-save-btn"),n=s.innerHTML;s.disabled=!0,s.innerHTML='<div uk-spinner="ratio: 0.6"></div> Saving...';let i=[...document.querySelectorAll(".rp-route-row")].map(o=>({Domain:o.querySelector('[data-field="domain"]').value.trim(),Upstream:o.querySelector('[data-field="upstream"]').value.trim()})).filter(o=>o.Domain&&o.Upstream);try{await d.put(`/sites/${e}/rp-routes`,i),c.success("Routes saved")}catch(o){c.error(o.message)}finally{s.disabled=!1,s.innerHTML=n}},{signal:F.signal})}async function At(t,{id:e}){let[{site:a,domains:s,sftp:n},i,o]=await Promise.all([d.get(`/sites/${e}`),d.get("/sites"),d.get(`/sites/${e}/configs`)]),r=Array.isArray(i)?i:[],l=a.SiteType===1||a.SiteType===2,p=a.SiteType===6,k=[1,2,4,5].includes(a.SiteType);if(t.innerHTML=`
        <div class="kp-view-header">
            <div class="uk-flex uk-flex-middle" style="gap:12px">
                <button class="kp-btn-icon" id="sd-back"><span uk-icon="arrow-left"></span></button>
                <div class="kp-site-nav-wrap">
                    <select id="sd-site-nav" class="uk-select kp-select">
                        ${r.map(v=>`<option value="${v.ID}" ${v.ID===a.ID?"selected":""}>${v.Name}</option>`).join("")}
                    </select>
                    <span class="kp-site-nav-arrow">&#9660;</span>
                </div>
                ${p?"":P(a.SiteStatus)}
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
            <li id="kp-manage-pill">
                <a href="javascript:void(0);" class="kp-pill-dropdown-btn">
                    Manage <span uk-icon="icon: chevron-down; ratio: 0.8"></span>
                </a>
                <div class="kp-pill-dropdown" id="kp-manage-dropdown" hidden>
                    <a href="#" data-switcher="0"><span uk-icon="icon: server; ratio: 0.85"></span> Routes</a>
                    <hr>
                    <div class="kp-pill-dropdown-section">Security</div>
                    <a href="#" data-switcher="3"><span uk-icon="icon: lock; ratio: 0.85"></span> Security</a>
                    <a href="#" data-switcher="4"><span uk-icon="icon: lifesaver; ratio: 0.85"></span> WAF</a>
                </div>
            </li>
            <li data-pill="1"><a href="#">Stats</a></li>
            <li data-pill="2"><a href="#">Logs</a></li>
        </ul>

        <!-- switcher panels -->
        <ul class="uk-switcher" id="kp-site-switcher">
            <li>${ee()}</li>
            <li>${nt(e,a.SiteType)}</li>
            <li>${ot(e,a.SiteType)}</li>
            <li>${M(e)}</li>
            <li id="waf-tab-panel"></li>
        </ul>
        `:`
        <!-- tab pills -->
        <ul class="kp-tab-pills" id="kp-site-pills">
            <li id="kp-manage-pill">
                <a href="javascript:void(0);" class="kp-pill-dropdown-btn">
                    Manage <span uk-icon="icon: chevron-down; ratio: 0.8"></span>
                </a>
                <div class="kp-pill-dropdown" id="kp-manage-dropdown" hidden>
                    <a href="#" data-switcher="0"><span uk-icon="icon: home; ratio: 0.85"></span> Overview</a>
                    <hr>
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
                    <hr>
                    <div class="kp-pill-dropdown-section">Tools</div>
                    ${a.SiteType===1?`<a href="#" data-switcher="${l?10:9}"><span uk-icon="icon: file-text; ratio: 0.85"></span> WP-CLI</a>`:""}
                    <a href="#" data-switcher="${a.SiteType===1?l?11:10:l?10:9}"><span uk-icon="icon: history; ratio: 0.85"></span> Backups</a>
                    ${k?`<a href="#" data-switcher="${a.SiteType===1?l?12:11:l?11:10}"><span uk-icon="icon: clock; ratio: 0.85"></span> Crons</a>`:""}
                </div>
            </li>
            <li data-pill="1"><a href="#">Stats</a></li>
            <li data-pill="${l?7:6}"><a href="#">Logs</a></li>
        </ul>

        <!-- switcher panels (driven by pills above) -->
        <ul class="uk-switcher" id="kp-site-switcher">
            <li>${It(a,s??[],n,a.ParentID??0,r.find(v=>v.ID===a.ParentID)?.Name??null)}</li>
            <li>${nt(e,a.SiteType)}</li>
            <li>${N(e,1,o[1])}</li>
            ${l?`<li>${N(e,2,o[2])}</li>`:""}
            <li>${N(e,3,o[3])}</li>
            <li>${N(e,4,o[4])}</li>
            <li>${wt(e,o[5])}</li>
            <li>${ot(e,a.SiteType)}</li>
            <li>${M(e)}</li>
            <li id="waf-tab-panel"></li>
            ${a.SiteType===1?`<li>${_t(e)}</li>`:""}
            <li>${ft(e)}</li>
            ${k?`<li>${$t(e)}</li>`:""}
        </ul>`}`,document.getElementById("sd-back").addEventListener("click",()=>h.go("sites")),document.getElementById("sd-edit").addEventListener("click",()=>O(a)),document.getElementById("sd-site-nav")?.addEventListener("change",v=>{h.go("site-detail",{id:v.target.value})}),G(t),C(t),Tt(t,e),te(t,e),Ht(e),p){se(t,e),ae(e),Rt(t);return}document.getElementById("sd-recreate").addEventListener("click",async()=>{S("Recreating Pod","Recreating containers for this site...");try{await d.post(`/sites/${e}/recreate`),w(),c.success("Pod recreated"),h.go("site-detail",{id:e})}catch(v){w(),c.error(v.message)}}),document.getElementById("sd-clone")?.addEventListener("click",async()=>{let v=await W(a.Name);if(v){S("Cloning Site","Copying files and database \u2014 this may take a few minutes...");try{await d.post(`/sites/${e}/clone`,{name:v}),w(),c.success(`Site cloned as '${v}'`),h.go("sites")}catch(b){w(),c.error(b.message)}}}),t.querySelectorAll("[data-action]").forEach(v=>{v.addEventListener("click",async()=>{let b=v.dataset.action;if(b==="flush"){try{await d.post(`/sites/${e}/flush`),c.success("Caches flushed")}catch(m){c.error(m.message)}return}S(`${{start:"Starting",stop:"Stopping",restart:"Restarting",update:"Updating"}[b]??b} Pod`,"Please wait...");try{await d.post(`/sites/${e}/${b}`),w(),c.success(`Site ${b} successful`),h.go("site-detail",{id:e})}catch(m){w(),c.error(m.message)}})}),xt(t,e),Dt(t,e),a.SiteType===1&&Mt(t,e),qt(t,e,a),yt(t,e),R(t,e),k&&(Lt(t,e),Q(t,e)),pt(t,e,a.SiteType),ut(e,a.SiteType),Rt(t),Pt(s??[])}async function Y(t){let e=document.getElementById("totp-qr-img"),a=document.getElementById("totp-qr-wrap");if(!e||!a)return;if(a.querySelectorAll(".totp-uri-text").forEach(n=>n.remove()),typeof QRCode<"u")try{let n=await new Promise((i,o)=>{QRCode.toDataURL(t,{width:220,margin:2},(r,l)=>{r?o(r):i(l)})});e.src=n,e.style.display="";return}catch{}let s=document.createElement("p");s.className="totp-uri-text kp-muted uk-text-small",s.style.wordBreak="break-all",s.textContent=t,a.appendChild(s)}function X(t){document.getElementById("kp-backup-codes-modal")?.remove();let a=`
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
`),i=document.getElementById("kp-backup-copy-btn");if(navigator.clipboard)navigator.clipboard.writeText(n).then(()=>{i.textContent="Copied!"});else{let o=document.createElement("textarea");o.value=n,o.style.cssText="position:fixed;opacity:0",document.body.appendChild(o),o.select();try{document.execCommand("copy"),i.textContent="Copied!"}catch{}o.remove()}}),document.getElementById("kp-backup-done-btn").addEventListener("click",()=>{s.hide(),document.getElementById("kp-backup-codes-modal")?.remove(),h.go("users")})}function Nt(t){document.body.insertAdjacentHTML("beforeend",`
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
                            <input class="uk-input kp-input" name="phone" type="tel">
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
        </div>`);let a=UIkit.modal("#kp-create-user-modal");a.show(),document.getElementById("create-user-form").addEventListener("submit",async s=>{s.preventDefault();let n=s.target.querySelector('[type="submit"]'),i=n.innerHTML;n.disabled=!0,n.innerHTML='<div uk-spinner="ratio: 0.6"></div> Creating...';let o=new FormData(s.target),r={fname:o.get("fname").trim(),lname:o.get("lname").trim(),uname:o.get("uname").trim(),email:o.get("email").trim(),phone:o.get("phone").trim(),password:o.get("password"),role:parseInt(o.get("role"))};try{let l=q(await d.post("/users",r));document.getElementById("users-table-body").insertAdjacentHTML("beforeend",rt(l)),c.success(`User '${l.uname}' created`),document.getElementById("create-user-form").style.display="none",document.getElementById("cu-totp-section").style.display="",ne(l.id,a)}catch(l){c.error(l.message),n.disabled=!1,n.innerHTML=i}}),document.getElementById("kp-create-user-modal").addEventListener("hidden",()=>document.getElementById("kp-create-user-modal")?.remove())}function ne(t,e){let a=()=>{e.hide(),document.getElementById("kp-create-user-modal")?.remove(),h.go("users")};document.getElementById("cu-totp-skip-btn").addEventListener("click",a),document.getElementById("cu-totp-setup-btn").addEventListener("click",async()=>{let s=document.getElementById("cu-totp-setup-btn");s.disabled=!0,s.textContent="Setting up\u2026";try{let n=await d.post(`/users/${t}/totp/setup`,{});document.getElementById("totp-secret-text").textContent=n.secret,document.getElementById("totp-setup-area").style.display="",document.getElementById("cu-totp-skip-btn").style.display="none",await Y(n.uri)}catch(n){c.error(n.message),s.disabled=!1,s.textContent="Enable TOTP"}}),document.getElementById("cu-totp-confirm-btn").addEventListener("click",async()=>{let s=document.getElementById("totp-confirm-code").value.trim();if(s.length!==6){c.error("Enter a 6-digit code");return}let n=document.getElementById("cu-totp-confirm-btn");n.disabled=!0;try{let i=await d.post(`/users/${t}/totp/confirm`,{code:s});e.hide(),document.getElementById("kp-create-user-modal")?.remove(),c.success("TOTP enabled"),i.backup_codes?.length?X(i.backup_codes):h.go("users")}catch(i){c.error(i.message),n.disabled=!1}})}async function Ft(t,e){document.getElementById("kp-edit-user-modal")?.remove();let a;try{a=q(await d.get(`/users/${e}`))}catch(p){c.error(p.message);return}let s=window.KP?.user?.role===99,n=`
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
                            <input class="uk-input kp-input" name="phone" type="tel" value="${a.phone||""}">
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
        </div>`;document.body.insertAdjacentHTML("beforeend",n);let i=UIkit.modal("#kp-edit-user-modal");i.show(),document.getElementById("edit-user-form").addEventListener("submit",async p=>{p.preventDefault();let k=p.target.querySelector('[type="submit"]'),v=k.innerHTML;k.disabled=!0,k.innerHTML='<div uk-spinner="ratio: 0.6"></div> Saving...';let b=new FormData(p.target),u={fname:b.get("fname").trim(),lname:b.get("lname").trim(),email:b.get("email").trim(),phone:b.get("phone").trim()};if(s){u.role=parseInt(b.get("role"));let g=b.get("uname");g&&(u.uname=g.trim())}let m=b.get("password");m&&(u.password=m);try{await d.put(`/users/${e}`,u),i.hide(),document.getElementById("kp-edit-user-modal")?.remove(),c.success("User updated"),h.go("users")}catch(g){c.error(g.message),k.disabled=!1,k.innerHTML=v}});let o=document.getElementById("totp-setup-btn");o&&o.addEventListener("click",async()=>{o.disabled=!0,o.textContent="Setting up\u2026";try{let p=await d.post(`/users/${e}/totp/setup`,{});document.getElementById("totp-secret-text").textContent=p.secret,document.getElementById("totp-setup-area").style.display="",await Y(p.uri)}catch(p){c.error(p.message),o.disabled=!1,o.textContent="Enable TOTP"}});let r=document.getElementById("totp-confirm-btn");r&&r.addEventListener("click",async()=>{let p=document.getElementById("totp-confirm-code").value.trim();if(p.length!==6){c.error("Enter a 6-digit code");return}r.disabled=!0;try{let k=await d.post(`/users/${e}/totp/confirm`,{code:p});i.hide(),document.getElementById("kp-edit-user-modal")?.remove(),c.success("TOTP enabled"),k.backup_codes?.length?X(k.backup_codes):h.go("users")}catch(k){c.error(k.message),r.disabled=!1}});let l=document.getElementById("totp-disable-btn");l&&l.addEventListener("click",async()=>{l.disabled=!0;try{await d.delete(`/users/${e}/totp`),c.success("TOTP disabled"),i.hide(),document.getElementById("kp-edit-user-modal")?.remove(),h.go("users")}catch(p){c.error(p.message),l.disabled=!1}}),document.getElementById("kp-edit-user-modal").addEventListener("hidden",()=>document.getElementById("kp-edit-user-modal")?.remove())}async function Ut(t){if(!D()){t.innerHTML=L("Access denied");return}let e=await d.get("/users");t.innerHTML=`
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
                        <th>Created</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody id="users-table-body">
                    ${e.map(a=>rt(q(a))).join("")}
                </tbody>
            </table>
        </div>`,document.getElementById("users-new-btn").addEventListener("click",()=>Nt(t)),ie(t)}function rt(t){let e=t.role===99?'<span class="kp-badge kp-badge-admin">Admin</span>':'<span class="kp-badge kp-badge-manager">Manager</span>';return`<tr data-user-id="${t.id}">
        <td><strong>${t.fname} ${t.lname}</strong></td>
        <td><span style="font-family:monospace">${t.uname}</span></td>
        <td>${t.email}</td>
        <td>${e}</td>
        <td class="uk-text-center">${t.totp_enabled?'<span uk-icon="icon: check; ratio: 0.9" style="color:var(--kp-success)"></span>':'<span uk-icon="icon: close; ratio: 0.9" style="color:var(--kp-text-dim)"></span>'}</td>
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
    </tr>`}function ie(t){t.addEventListener("click",async e=>{let a=e.target.closest('[data-action="delete-user"]');if(!(!a||!await $("Delete User","Delete this user? This cannot be undone.")))try{await d.delete(`/users/${a.dataset.uid}`),a.closest("tr").remove(),c.success("User deleted")}catch(n){c.error(n.message)}}),t.addEventListener("click",async e=>{let a=e.target.closest('[data-action="edit-user"]');a&&Ft(t,a.dataset.uid)})}h.register("dashboard",t=>bt(t));h.register("sites",t=>kt(t));h.register("site-detail",(t,e)=>At(t,e));h.register("users",t=>Ut(t));h.register("settings",t=>ht(t));h.register("security",t=>vt(t));document.addEventListener("click",t=>{let e=t.target.closest("[data-view]");e&&(t.preventDefault(),h.go(e.dataset.view))});document.addEventListener("click",async t=>{let e=t.target.closest("[data-action]");if(!e)return;t.stopPropagation();let{action:a,id:s}=e.dataset;switch(a){case"manage":h.go("site-detail",{id:s});break;case"start":await Z(s,"start","Starting Site","Starting all containers - please wait...");break;case"stop":await Z(s,"stop","Stopping Site","Gracefully stopping all containers - please wait...");break;case"restart":await Z(s,"restart","Restarting Site","Restarting all containers - please wait...");break;case"flush":await Z(s,"flush","Flushing Caches","Clearing container caches - please wait...");break;case"edit":{let n=await d.get(`/sites/${s}`);O(n.site);break}case"clone":{let n=await W(e.dataset.name??s);if(!n)break;S("Cloning Site","Copying files and database \u2014 this may take a few minutes...");try{let i=await d.post(`/sites/${s}/clone`,{name:n}),o=!1,r=0;for(;!o&&r<60;)await new Promise(p=>setTimeout(p,3e3)),o=(await d.get("/sites")).some(p=>p.ID===i.id&&p.SiteStatus===1),r++;w(),o?(c.success(`Site cloned as '${n}'`),h.go("sites")):c.error("Clone timed out \u2014 check container logs")}catch(i){w(),c.error(i.message)}break}case"delete":await oe(s);break;case"recreate":S("Recreating Pod","Recreating containers for this site - this may take a few minutes...");try{await d.post(`/sites/${s}/recreate`),w(),c.success("Pod recreated"),h.go("sites")}catch(n){w(),c.error(n.message)}break}});document.addEventListener("kp:bulk-action",async t=>{let{action:e,ids:a}=t.detail;if(!a.length)return;S(`${{start:"Starting",stop:"Stopping",restart:"Restarting",flush:"Flushing Caches"}[e]} ${a.length} Site${a.length!==1?"s":""}`,"Please wait...");let n=await Promise.allSettled(a.map(o=>d.post(`/sites/${o}/${e}`)));w();let i=n.filter(o=>o.status==="rejected").length;i===0?c.success(`${e.charAt(0).toUpperCase()+e.slice(1)} complete for ${a.length} site${a.length!==1?"s":""}`):c.error(`${i} of ${a.length} sites failed \u2014 check logs`),["start","stop","restart"].includes(e)&&h.go("sites")});async function Z(t,e,a,s){S(a,s);try{await d.post(`/sites/${t}/${e}`),w(),c.success(a+" complete")}catch(n){w(),c.error(n.message)}}async function oe(t){if(!await $("Delete Site","This will stop and permanently remove the pod and all its data. Are you sure?"))return;S("Deleting Site","Stopping containers and removing the pod - please wait...");try{await d.delete(`/sites/${t}`)}catch{}let a=!1,s=0;for(;!a&&s<10;){try{await new Promise(i=>setTimeout(i,2e3)),a=!(await d.get("/sites")).find(i=>i.ID===parseInt(t))}catch{}s++}w(),a?(c.success("Site deleted"),h.go("sites")):c.error("Delete failed - site still exists after 20s")}window.addEventListener("hashchange",()=>{if(h._ownHashChange)return;let{view:t,params:e}=at();h.go(t,e)});var{view:le,params:re}=at();h.go(le,re);})();
