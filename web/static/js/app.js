/*! PodNest - Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com> | MIT License */

"use strict";(()=>{var Cn=Object.create;var rs=Object.defineProperty;var Pn=Object.getOwnPropertyDescriptor;var In=Object.getOwnPropertyNames;var _n=Object.getPrototypeOf,Bn=Object.prototype.hasOwnProperty;var B=(e,t)=>()=>{try{return t||e((t={exports:{}}).exports,t),t.exports}catch(s){throw t=0,s}};var qn=(e,t,s,a)=>{if(t&&typeof t=="object"||typeof t=="function")for(let n of In(t))!Bn.call(e,n)&&n!==s&&rs(e,n,{get:()=>t[n],enumerable:!(a=Pn(t,n))||a.enumerable});return e};var Mn=(e,t,s)=>(s=e!=null?Cn(_n(e)):{},qn(t||!e||!e.__esModule?rs(s,"default",{value:e,enumerable:!0}):s,e));var Sa=B((sc,xa)=>{xa.exports=function(){return typeof Promise=="function"&&Promise.prototype&&Promise.prototype.then}});var K=B(ae=>{var Ht,Pi=[0,26,44,70,100,134,172,196,242,292,346,404,466,532,581,655,733,815,901,991,1085,1156,1258,1364,1474,1588,1706,1828,1921,2051,2185,2323,2465,2611,2761,2876,3034,3196,3362,3532,3706];ae.getSymbolSize=function(t){if(!t)throw new Error('"version" cannot be null or undefined');if(t<1||t>40)throw new Error('"version" should be in range from 1 to 40');return t*4+17};ae.getSymbolTotalCodewords=function(t){return Pi[t]};ae.getBCHDigit=function(e){let t=0;for(;e!==0;)t++,e>>>=1;return t};ae.setToSJISFunction=function(t){if(typeof t!="function")throw new Error('"toSJISFunc" is not a valid function.');Ht=t};ae.isKanjiModeEnabled=function(){return typeof Ht<"u"};ae.toSJIS=function(t){return Ht(t)}});var Ge=B(W=>{W.L={bit:1};W.M={bit:0};W.Q={bit:3};W.H={bit:2};function Ii(e){if(typeof e!="string")throw new Error("Param is not a string");switch(e.toLowerCase()){case"l":case"low":return W.L;case"m":case"medium":return W.M;case"q":case"quartile":return W.Q;case"h":case"high":return W.H;default:throw new Error("Unknown EC Level: "+e)}}W.isValid=function(t){return t&&typeof t.bit<"u"&&t.bit>=0&&t.bit<4};W.from=function(t,s){if(W.isValid(t))return t;try{return Ii(t)}catch{return s}}});var Ta=B((ic,Ea)=>{function $a(){this.buffer=[],this.length=0}$a.prototype={get:function(e){let t=Math.floor(e/8);return(this.buffer[t]>>>7-e%8&1)===1},put:function(e,t){for(let s=0;s<t;s++)this.putBit((e>>>t-s-1&1)===1)},getLengthInBits:function(){return this.length},putBit:function(e){let t=Math.floor(this.length/8);this.buffer.length<=t&&this.buffer.push(0),e&&(this.buffer[t]|=128>>>this.length%8),this.length++}};Ea.exports=$a});var Ca=B((oc,La)=>{function Le(e){if(!e||e<1)throw new Error("BitMatrix size must be defined and greater than 0");this.size=e,this.data=new Uint8Array(e*e),this.reservedBit=new Uint8Array(e*e)}Le.prototype.set=function(e,t,s,a){let n=e*this.size+t;this.data[n]=s,a&&(this.reservedBit[n]=!0)};Le.prototype.get=function(e,t){return this.data[e*this.size+t]};Le.prototype.xor=function(e,t,s){this.data[e*this.size+t]^=s};Le.prototype.isReserved=function(e,t){return this.reservedBit[e*this.size+t]};La.exports=Le});var Pa=B(Ye=>{var _i=K().getSymbolSize;Ye.getRowColCoords=function(t){if(t===1)return[];let s=Math.floor(t/7)+2,a=_i(t),n=a===145?26:Math.ceil((a-13)/(2*s-2))*2,i=[a-7];for(let o=1;o<s-1;o++)i[o]=i[o-1]-n;return i.push(6),i.reverse()};Ye.getPositions=function(t){let s=[],a=Ye.getRowColCoords(t),n=a.length;for(let i=0;i<n;i++)for(let o=0;o<n;o++)i===0&&o===0||i===0&&o===n-1||i===n-1&&o===0||s.push([a[i],a[o]]);return s}});var Ba=B(_a=>{var Bi=K().getSymbolSize,Ia=7;_a.getPositions=function(t){let s=Bi(t);return[[0,0],[s-Ia,0],[0,s-Ia]]}});var qa=B(q=>{q.Patterns={PATTERN000:0,PATTERN001:1,PATTERN010:2,PATTERN011:3,PATTERN100:4,PATTERN101:5,PATTERN110:6,PATTERN111:7};var ne={N1:3,N2:3,N3:40,N4:10};q.isValid=function(t){return t!=null&&t!==""&&!isNaN(t)&&t>=0&&t<=7};q.from=function(t){return q.isValid(t)?parseInt(t,10):void 0};q.getPenaltyN1=function(t){let s=t.size,a=0,n=0,i=0,o=null,l=null;for(let r=0;r<s;r++){n=i=0,o=l=null;for(let c=0;c<s;c++){let u=t.get(r,c);u===o?n++:(n>=5&&(a+=ne.N1+(n-5)),o=u,n=1),u=t.get(c,r),u===l?i++:(i>=5&&(a+=ne.N1+(i-5)),l=u,i=1)}n>=5&&(a+=ne.N1+(n-5)),i>=5&&(a+=ne.N1+(i-5))}return a};q.getPenaltyN2=function(t){let s=t.size,a=0;for(let n=0;n<s-1;n++)for(let i=0;i<s-1;i++){let o=t.get(n,i)+t.get(n,i+1)+t.get(n+1,i)+t.get(n+1,i+1);(o===4||o===0)&&a++}return a*ne.N2};q.getPenaltyN3=function(t){let s=t.size,a=0,n=0,i=0;for(let o=0;o<s;o++){n=i=0;for(let l=0;l<s;l++)n=n<<1&2047|t.get(o,l),l>=10&&(n===1488||n===93)&&a++,i=i<<1&2047|t.get(l,o),l>=10&&(i===1488||i===93)&&a++}return a*ne.N3};q.getPenaltyN4=function(t){let s=0,a=t.data.length;for(let i=0;i<a;i++)s+=t.data[i];return Math.abs(Math.ceil(s*100/a/5)-10)*ne.N4};function qi(e,t,s){switch(e){case q.Patterns.PATTERN000:return(t+s)%2===0;case q.Patterns.PATTERN001:return t%2===0;case q.Patterns.PATTERN010:return s%3===0;case q.Patterns.PATTERN011:return(t+s)%3===0;case q.Patterns.PATTERN100:return(Math.floor(t/2)+Math.floor(s/3))%2===0;case q.Patterns.PATTERN101:return t*s%2+t*s%3===0;case q.Patterns.PATTERN110:return(t*s%2+t*s%3)%2===0;case q.Patterns.PATTERN111:return(t*s%3+(t+s)%2)%2===0;default:throw new Error("bad maskPattern:"+e)}}q.applyMask=function(t,s){let a=s.size;for(let n=0;n<a;n++)for(let i=0;i<a;i++)s.isReserved(i,n)||s.xor(i,n,qi(t,i,n))};q.getBestMask=function(t,s){let a=Object.keys(q.Patterns).length,n=0,i=1/0;for(let o=0;o<a;o++){s(o),q.applyMask(o,t);let l=q.getPenaltyN1(t)+q.getPenaltyN2(t)+q.getPenaltyN3(t)+q.getPenaltyN4(t);q.applyMask(o,t),l<i&&(i=l,n=o)}return n}});var Ut=B(Nt=>{var J=Ge(),Qe=[1,1,1,1,1,1,1,1,1,1,2,2,1,2,2,4,1,2,4,4,2,4,4,4,2,4,6,5,2,4,6,6,2,5,8,8,4,5,8,8,4,5,8,11,4,8,10,11,4,9,12,16,4,9,16,16,6,10,12,18,6,10,17,16,6,11,16,19,6,13,18,21,7,14,21,25,8,16,20,25,8,17,23,25,9,17,23,34,9,18,25,30,10,20,27,32,12,21,29,35,12,23,34,37,12,25,34,40,13,26,35,42,14,28,38,45,15,29,40,48,16,31,43,51,17,33,45,54,18,35,48,57,19,37,51,60,19,38,53,63,20,40,56,66,21,43,59,70,22,45,62,74,24,47,65,77,25,49,68,81],Ze=[7,10,13,17,10,16,22,28,15,26,36,44,20,36,52,64,26,48,72,88,36,64,96,112,40,72,108,130,48,88,132,156,60,110,160,192,72,130,192,224,80,150,224,264,96,176,260,308,104,198,288,352,120,216,320,384,132,240,360,432,144,280,408,480,168,308,448,532,180,338,504,588,196,364,546,650,224,416,600,700,224,442,644,750,252,476,690,816,270,504,750,900,300,560,810,960,312,588,870,1050,336,644,952,1110,360,700,1020,1200,390,728,1050,1260,420,784,1140,1350,450,812,1200,1440,480,868,1290,1530,510,924,1350,1620,540,980,1440,1710,570,1036,1530,1800,570,1064,1590,1890,600,1120,1680,1980,630,1204,1770,2100,660,1260,1860,2220,720,1316,1950,2310,750,1372,2040,2430];Nt.getBlocksCount=function(t,s){switch(s){case J.L:return Qe[(t-1)*4+0];case J.M:return Qe[(t-1)*4+1];case J.Q:return Qe[(t-1)*4+2];case J.H:return Qe[(t-1)*4+3];default:return}};Nt.getTotalCodewordsCount=function(t,s){switch(s){case J.L:return Ze[(t-1)*4+0];case J.M:return Ze[(t-1)*4+1];case J.Q:return Ze[(t-1)*4+2];case J.H:return Ze[(t-1)*4+3];default:return}}});var Ma=B(tt=>{var Ce=new Uint8Array(512),et=new Uint8Array(256);(function(){let t=1;for(let s=0;s<255;s++)Ce[s]=t,et[t]=s,t<<=1,t&256&&(t^=285);for(let s=255;s<512;s++)Ce[s]=Ce[s-255]})();tt.log=function(t){if(t<1)throw new Error("log("+t+")");return et[t]};tt.exp=function(t){return Ce[t]};tt.mul=function(t,s){return t===0||s===0?0:Ce[et[t]+et[s]]}});var Aa=B(Pe=>{var Ft=Ma();Pe.mul=function(t,s){let a=new Uint8Array(t.length+s.length-1);for(let n=0;n<t.length;n++)for(let i=0;i<s.length;i++)a[n+i]^=Ft.mul(t[n],s[i]);return a};Pe.mod=function(t,s){let a=new Uint8Array(t);for(;a.length-s.length>=0;){let n=a[0];for(let o=0;o<s.length;o++)a[o]^=Ft.mul(s[o],n);let i=0;for(;i<a.length&&a[i]===0;)i++;a=a.slice(i)}return a};Pe.generateECPolynomial=function(t){let s=new Uint8Array([1]);for(let a=0;a<t;a++)s=Pe.mul(s,new Uint8Array([1,Ft.exp(a)]));return s}});var Ha=B((mc,Da)=>{var Ra=Aa();function Wt(e){this.genPoly=void 0,this.degree=e,this.degree&&this.initialize(this.degree)}Wt.prototype.initialize=function(t){this.degree=t,this.genPoly=Ra.generateECPolynomial(this.degree)};Wt.prototype.encode=function(t){if(!this.genPoly)throw new Error("Encoder not initialized");let s=new Uint8Array(t.length+this.degree);s.set(t);let a=Ra.mod(s,this.genPoly),n=this.degree-a.length;if(n>0){let i=new Uint8Array(this.degree);return i.set(a,n),i}return a};Da.exports=Wt});var jt=B(Na=>{Na.isValid=function(t){return!isNaN(t)&&t>=1&&t<=40}});var zt=B(z=>{var Ua="[0-9]+",Mi="[A-Z $%*+\\-./:]+",Ie="(?:[u3000-u303F]|[u3040-u309F]|[u30A0-u30FF]|[uFF00-uFFEF]|[u4E00-u9FAF]|[u2605-u2606]|[u2190-u2195]|u203B|[u2010u2015u2018u2019u2025u2026u201Cu201Du2225u2260]|[u0391-u0451]|[u00A7u00A8u00B1u00B4u00D7u00F7])+";Ie=Ie.replace(/u/g,"\\u");var Ai="(?:(?![A-Z0-9 $%*+\\-./:]|"+Ie+`)(?:.|[\r
]))+`;z.KANJI=new RegExp(Ie,"g");z.BYTE_KANJI=new RegExp("[^A-Z0-9 $%*+\\-./:]+","g");z.BYTE=new RegExp(Ai,"g");z.NUMERIC=new RegExp(Ua,"g");z.ALPHANUMERIC=new RegExp(Mi,"g");var Ri=new RegExp("^"+Ie+"$"),Di=new RegExp("^"+Ua+"$"),Hi=new RegExp("^[A-Z0-9 $%*+\\-./:]+$");z.testKanji=function(t){return Ri.test(t)};z.testNumeric=function(t){return Di.test(t)};z.testAlphanumeric=function(t){return Hi.test(t)}});var X=B(M=>{var Ni=jt(),Ot=zt();M.NUMERIC={id:"Numeric",bit:1,ccBits:[10,12,14]};M.ALPHANUMERIC={id:"Alphanumeric",bit:2,ccBits:[9,11,13]};M.BYTE={id:"Byte",bit:4,ccBits:[8,16,16]};M.KANJI={id:"Kanji",bit:8,ccBits:[8,10,12]};M.MIXED={bit:-1};M.getCharCountIndicator=function(t,s){if(!t.ccBits)throw new Error("Invalid mode: "+t);if(!Ni.isValid(s))throw new Error("Invalid version: "+s);return s>=1&&s<10?t.ccBits[0]:s<27?t.ccBits[1]:t.ccBits[2]};M.getBestModeForData=function(t){return Ot.testNumeric(t)?M.NUMERIC:Ot.testAlphanumeric(t)?M.ALPHANUMERIC:Ot.testKanji(t)?M.KANJI:M.BYTE};M.toString=function(t){if(t&&t.id)return t.id;throw new Error("Invalid mode")};M.isValid=function(t){return t&&t.bit&&t.ccBits};function Ui(e){if(typeof e!="string")throw new Error("Param is not a string");switch(e.toLowerCase()){case"numeric":return M.NUMERIC;case"alphanumeric":return M.ALPHANUMERIC;case"kanji":return M.KANJI;case"byte":return M.BYTE;default:throw new Error("Unknown mode: "+e)}}M.from=function(t,s){if(M.isValid(t))return t;try{return Ui(t)}catch{return s}}});var Oa=B(ie=>{var st=K(),Fi=Ut(),Fa=Ge(),G=X(),Vt=jt(),ja=7973,Wa=st.getBCHDigit(ja);function Wi(e,t,s){for(let a=1;a<=40;a++)if(t<=ie.getCapacity(a,s,e))return a}function za(e,t){return G.getCharCountIndicator(e,t)+4}function ji(e,t){let s=0;return e.forEach(function(a){let n=za(a.mode,t);s+=n+a.getBitsLength()}),s}function zi(e,t){for(let s=1;s<=40;s++)if(ji(e,s)<=ie.getCapacity(s,t,G.MIXED))return s}ie.from=function(t,s){return Vt.isValid(t)?parseInt(t,10):s};ie.getCapacity=function(t,s,a){if(!Vt.isValid(t))throw new Error("Invalid QR Code version");typeof a>"u"&&(a=G.BYTE);let n=st.getSymbolTotalCodewords(t),i=Fi.getTotalCodewordsCount(t,s),o=(n-i)*8;if(a===G.MIXED)return o;let l=o-za(a,t);switch(a){case G.NUMERIC:return Math.floor(l/10*3);case G.ALPHANUMERIC:return Math.floor(l/11*2);case G.KANJI:return Math.floor(l/13);case G.BYTE:default:return Math.floor(l/8)}};ie.getBestVersionForData=function(t,s){let a,n=Fa.from(s,Fa.M);if(Array.isArray(t)){if(t.length>1)return zi(t,n);if(t.length===0)return 1;a=t[0]}else a=t;return Wi(a.mode,a.getLength(),n)};ie.getEncodedBits=function(t){if(!Vt.isValid(t)||t<7)throw new Error("Invalid QR Code version");let s=t<<12;for(;st.getBCHDigit(s)-Wa>=0;)s^=ja<<st.getBCHDigit(s)-Wa;return t<<12|s}});var Xa=B(Ja=>{var Kt=K(),Ka=1335,Oi=21522,Va=Kt.getBCHDigit(Ka);Ja.getEncodedBits=function(t,s){let a=t.bit<<3|s,n=a<<10;for(;Kt.getBCHDigit(n)-Va>=0;)n^=Ka<<Kt.getBCHDigit(n)-Va;return(a<<10|n)^Oi}});var Ya=B((vc,Ga)=>{var Vi=X();function fe(e){this.mode=Vi.NUMERIC,this.data=e.toString()}fe.getBitsLength=function(t){return 10*Math.floor(t/3)+(t%3?t%3*3+1:0)};fe.prototype.getLength=function(){return this.data.length};fe.prototype.getBitsLength=function(){return fe.getBitsLength(this.data.length)};fe.prototype.write=function(t){let s,a,n;for(s=0;s+3<=this.data.length;s+=3)a=this.data.substr(s,3),n=parseInt(a,10),t.put(n,10);let i=this.data.length-s;i>0&&(a=this.data.substr(s),n=parseInt(a,10),t.put(n,i*3+1))};Ga.exports=fe});var Za=B((yc,Qa)=>{var Ki=X(),Jt=["0","1","2","3","4","5","6","7","8","9","A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z"," ","$","%","*","+","-",".","/",":"];function ge(e){this.mode=Ki.ALPHANUMERIC,this.data=e}ge.getBitsLength=function(t){return 11*Math.floor(t/2)+6*(t%2)};ge.prototype.getLength=function(){return this.data.length};ge.prototype.getBitsLength=function(){return ge.getBitsLength(this.data.length)};ge.prototype.write=function(t){let s;for(s=0;s+2<=this.data.length;s+=2){let a=Jt.indexOf(this.data[s])*45;a+=Jt.indexOf(this.data[s+1]),t.put(a,11)}this.data.length%2&&t.put(Jt.indexOf(this.data[s]),6)};Qa.exports=ge});var tn=B((wc,en)=>{var Ji=X();function ve(e){this.mode=Ji.BYTE,typeof e=="string"?this.data=new TextEncoder().encode(e):this.data=new Uint8Array(e)}ve.getBitsLength=function(t){return t*8};ve.prototype.getLength=function(){return this.data.length};ve.prototype.getBitsLength=function(){return ve.getBitsLength(this.data.length)};ve.prototype.write=function(e){for(let t=0,s=this.data.length;t<s;t++)e.put(this.data[t],8)};en.exports=ve});var an=B((xc,sn)=>{var Xi=X(),Gi=K();function ye(e){this.mode=Xi.KANJI,this.data=e}ye.getBitsLength=function(t){return t*13};ye.prototype.getLength=function(){return this.data.length};ye.prototype.getBitsLength=function(){return ye.getBitsLength(this.data.length)};ye.prototype.write=function(e){let t;for(t=0;t<this.data.length;t++){let s=Gi.toSJIS(this.data[t]);if(s>=33088&&s<=40956)s-=33088;else if(s>=57408&&s<=60351)s-=49472;else throw new Error("Invalid SJIS character: "+this.data[t]+`
Make sure your charset is UTF-8`);s=(s>>>8&255)*192+(s&255),e.put(s,13)}};sn.exports=ye});var nn=B((Sc,Xt)=>{"use strict";var _e={single_source_shortest_paths:function(e,t,s){var a={},n={};n[t]=0;var i=_e.PriorityQueue.make();i.push(t,0);for(var o,l,r,c,u,p,m,b,h;!i.empty();){o=i.pop(),l=o.value,c=o.cost,u=e[l]||{};for(r in u)u.hasOwnProperty(r)&&(p=u[r],m=c+p,b=n[r],h=typeof n[r]>"u",(h||b>m)&&(n[r]=m,i.push(r,m),a[r]=l))}if(typeof s<"u"&&typeof n[s]>"u"){var g=["Could not find a path from ",t," to ",s,"."].join("");throw new Error(g)}return a},extract_shortest_path_from_predecessor_list:function(e,t){for(var s=[],a=t,n;a;)s.push(a),n=e[a],a=e[a];return s.reverse(),s},find_path:function(e,t,s){var a=_e.single_source_shortest_paths(e,t,s);return _e.extract_shortest_path_from_predecessor_list(a,s)},PriorityQueue:{make:function(e){var t=_e.PriorityQueue,s={},a;e=e||{};for(a in t)t.hasOwnProperty(a)&&(s[a]=t[a]);return s.queue=[],s.sorter=e.sorter||t.default_sorter,s},default_sorter:function(e,t){return e.cost-t.cost},push:function(e,t){var s={value:e,cost:t};this.queue.push(s),this.queue.sort(this.sorter)},pop:function(){return this.queue.shift()},empty:function(){return this.queue.length===0}}};typeof Xt<"u"&&(Xt.exports=_e)});var mn=B(we=>{var _=X(),rn=Ya(),cn=Za(),dn=tn(),un=an(),Be=zt(),at=K(),Yi=nn();function on(e){return unescape(encodeURIComponent(e)).length}function qe(e,t,s){let a=[],n;for(;(n=e.exec(s))!==null;)a.push({data:n[0],index:n.index,mode:t,length:n[0].length});return a}function pn(e){let t=qe(Be.NUMERIC,_.NUMERIC,e),s=qe(Be.ALPHANUMERIC,_.ALPHANUMERIC,e),a,n;return at.isKanjiModeEnabled()?(a=qe(Be.BYTE,_.BYTE,e),n=qe(Be.KANJI,_.KANJI,e)):(a=qe(Be.BYTE_KANJI,_.BYTE,e),n=[]),t.concat(s,a,n).sort(function(o,l){return o.index-l.index}).map(function(o){return{data:o.data,mode:o.mode,length:o.length}})}function Gt(e,t){switch(t){case _.NUMERIC:return rn.getBitsLength(e);case _.ALPHANUMERIC:return cn.getBitsLength(e);case _.KANJI:return un.getBitsLength(e);case _.BYTE:return dn.getBitsLength(e)}}function Qi(e){return e.reduce(function(t,s){let a=t.length-1>=0?t[t.length-1]:null;return a&&a.mode===s.mode?(t[t.length-1].data+=s.data,t):(t.push(s),t)},[])}function Zi(e){let t=[];for(let s=0;s<e.length;s++){let a=e[s];switch(a.mode){case _.NUMERIC:t.push([a,{data:a.data,mode:_.ALPHANUMERIC,length:a.length},{data:a.data,mode:_.BYTE,length:a.length}]);break;case _.ALPHANUMERIC:t.push([a,{data:a.data,mode:_.BYTE,length:a.length}]);break;case _.KANJI:t.push([a,{data:a.data,mode:_.BYTE,length:on(a.data)}]);break;case _.BYTE:t.push([{data:a.data,mode:_.BYTE,length:on(a.data)}])}}return t}function eo(e,t){let s={},a={start:{}},n=["start"];for(let i=0;i<e.length;i++){let o=e[i],l=[];for(let r=0;r<o.length;r++){let c=o[r],u=""+i+r;l.push(u),s[u]={node:c,lastCount:0},a[u]={};for(let p=0;p<n.length;p++){let m=n[p];s[m]&&s[m].node.mode===c.mode?(a[m][u]=Gt(s[m].lastCount+c.length,c.mode)-Gt(s[m].lastCount,c.mode),s[m].lastCount+=c.length):(s[m]&&(s[m].lastCount=c.length),a[m][u]=Gt(c.length,c.mode)+4+_.getCharCountIndicator(c.mode,t))}}n=l}for(let i=0;i<n.length;i++)a[n[i]].end=0;return{map:a,table:s}}function ln(e,t){let s,a=_.getBestModeForData(e);if(s=_.from(t,a),s!==_.BYTE&&s.bit<a.bit)throw new Error('"'+e+'" cannot be encoded with mode '+_.toString(s)+`.
 Suggested mode is: `+_.toString(a));switch(s===_.KANJI&&!at.isKanjiModeEnabled()&&(s=_.BYTE),s){case _.NUMERIC:return new rn(e);case _.ALPHANUMERIC:return new cn(e);case _.KANJI:return new un(e);case _.BYTE:return new dn(e)}}we.fromArray=function(t){return t.reduce(function(s,a){return typeof a=="string"?s.push(ln(a,null)):a.data&&s.push(ln(a.data,a.mode)),s},[])};we.fromString=function(t,s){let a=pn(t,at.isKanjiModeEnabled()),n=Zi(a),i=eo(n,s),o=Yi.find_path(i.map,"start","end"),l=[];for(let r=1;r<o.length-1;r++)l.push(i.table[o[r]].node);return we.fromArray(Qi(l))};we.rawSplit=function(t){return we.fromArray(pn(t,at.isKanjiModeEnabled()))}});var bn=B(kn=>{var it=K(),Yt=Ge(),to=Ta(),so=Ca(),ao=Pa(),no=Ba(),es=qa(),ts=Ut(),io=Ha(),nt=Oa(),oo=Xa(),lo=X(),Qt=mn();function ro(e,t){let s=e.size,a=no.getPositions(t);for(let n=0;n<a.length;n++){let i=a[n][0],o=a[n][1];for(let l=-1;l<=7;l++)if(!(i+l<=-1||s<=i+l))for(let r=-1;r<=7;r++)o+r<=-1||s<=o+r||(l>=0&&l<=6&&(r===0||r===6)||r>=0&&r<=6&&(l===0||l===6)||l>=2&&l<=4&&r>=2&&r<=4?e.set(i+l,o+r,!0,!0):e.set(i+l,o+r,!1,!0))}}function co(e){let t=e.size;for(let s=8;s<t-8;s++){let a=s%2===0;e.set(s,6,a,!0),e.set(6,s,a,!0)}}function uo(e,t){let s=ao.getPositions(t);for(let a=0;a<s.length;a++){let n=s[a][0],i=s[a][1];for(let o=-2;o<=2;o++)for(let l=-2;l<=2;l++)o===-2||o===2||l===-2||l===2||o===0&&l===0?e.set(n+o,i+l,!0,!0):e.set(n+o,i+l,!1,!0)}}function po(e,t){let s=e.size,a=nt.getEncodedBits(t),n,i,o;for(let l=0;l<18;l++)n=Math.floor(l/3),i=l%3+s-8-3,o=(a>>l&1)===1,e.set(n,i,o,!0),e.set(i,n,o,!0)}function Zt(e,t,s){let a=e.size,n=oo.getEncodedBits(t,s),i,o;for(i=0;i<15;i++)o=(n>>i&1)===1,i<6?e.set(i,8,o,!0):i<8?e.set(i+1,8,o,!0):e.set(a-15+i,8,o,!0),i<8?e.set(8,a-i-1,o,!0):i<9?e.set(8,15-i-1+1,o,!0):e.set(8,15-i-1,o,!0);e.set(a-8,8,1,!0)}function mo(e,t){let s=e.size,a=-1,n=s-1,i=7,o=0;for(let l=s-1;l>0;l-=2)for(l===6&&l--;;){for(let r=0;r<2;r++)if(!e.isReserved(n,l-r)){let c=!1;o<t.length&&(c=(t[o]>>>i&1)===1),e.set(n,l-r,c),i--,i===-1&&(o++,i=7)}if(n+=a,n<0||s<=n){n-=a,a=-a;break}}}function ko(e,t,s){let a=new to;s.forEach(function(r){a.put(r.mode.bit,4),a.put(r.getLength(),lo.getCharCountIndicator(r.mode,e)),r.write(a)});let n=it.getSymbolTotalCodewords(e),i=ts.getTotalCodewordsCount(e,t),o=(n-i)*8;for(a.getLengthInBits()+4<=o&&a.put(0,4);a.getLengthInBits()%8!==0;)a.putBit(0);let l=(o-a.getLengthInBits())/8;for(let r=0;r<l;r++)a.put(r%2?17:236,8);return bo(a,e,t)}function bo(e,t,s){let a=it.getSymbolTotalCodewords(t),n=ts.getTotalCodewordsCount(t,s),i=a-n,o=ts.getBlocksCount(t,s),l=a%o,r=o-l,c=Math.floor(a/o),u=Math.floor(i/o),p=u+1,m=c-u,b=new io(m),h=0,g=new Array(o),v=new Array(o),$=0,y=new Uint8Array(e.buffer);for(let C=0;C<o;C++){let D=C<r?u:p;g[C]=y.slice(h,h+D),v[C]=b.encode(g[C]),h+=D,$=Math.max($,D)}let L=new Uint8Array(a),w=0,E,S;for(E=0;E<$;E++)for(S=0;S<o;S++)E<g[S].length&&(L[w++]=g[S][E]);for(E=0;E<m;E++)for(S=0;S<o;S++)L[w++]=v[S][E];return L}function ho(e,t,s,a){let n;if(Array.isArray(e))n=Qt.fromArray(e);else if(typeof e=="string"){let c=t;if(!c){let u=Qt.rawSplit(e);c=nt.getBestVersionForData(u,s)}n=Qt.fromString(e,c||40)}else throw new Error("Invalid data");let i=nt.getBestVersionForData(n,s);if(!i)throw new Error("The amount of data is too big to be stored in a QR Code");if(!t)t=i;else if(t<i)throw new Error(`
The chosen QR Code version cannot contain this amount of data.
Minimum version required to store current data is: `+i+`.
`);let o=ko(t,s,n),l=it.getSymbolSize(t),r=new so(l);return ro(r,t),co(r),uo(r,t),Zt(r,s,0),t>=7&&po(r,t),mo(r,o),isNaN(a)&&(a=es.getBestMask(r,Zt.bind(null,r,s))),es.applyMask(a,r),Zt(r,s,a),{modules:r,version:t,errorCorrectionLevel:s,maskPattern:a,segments:n}}kn.create=function(t,s){if(typeof t>"u"||t==="")throw new Error("No input text");let a=Yt.M,n,i;return typeof s<"u"&&(a=Yt.from(s.errorCorrectionLevel,Yt.M),n=nt.from(s.version),i=es.from(s.maskPattern),s.toSJISFunc&&it.setToSJISFunction(s.toSJISFunc)),ho(t,n,a,i)}});var ss=B(oe=>{function hn(e){if(typeof e=="number"&&(e=e.toString()),typeof e!="string")throw new Error("Color should be defined as hex string");let t=e.slice().replace("#","").split("");if(t.length<3||t.length===5||t.length>8)throw new Error("Invalid hex color: "+e);(t.length===3||t.length===4)&&(t=Array.prototype.concat.apply([],t.map(function(a){return[a,a]}))),t.length===6&&t.push("F","F");let s=parseInt(t.join(""),16);return{r:s>>24&255,g:s>>16&255,b:s>>8&255,a:s&255,hex:"#"+t.slice(0,6).join("")}}oe.getOptions=function(t){t||(t={}),t.color||(t.color={});let s=typeof t.margin>"u"||t.margin===null||t.margin<0?4:t.margin,a=t.width&&t.width>=21?t.width:void 0,n=t.scale||4;return{width:a,scale:a?4:n,margin:s,color:{dark:hn(t.color.dark||"#000000ff"),light:hn(t.color.light||"#ffffffff")},type:t.type,rendererOpts:t.rendererOpts||{}}};oe.getScale=function(t,s){return s.width&&s.width>=t+s.margin*2?s.width/(t+s.margin*2):s.scale};oe.getImageWidth=function(t,s){let a=oe.getScale(t,s);return Math.floor((t+s.margin*2)*a)};oe.qrToImageData=function(t,s,a){let n=s.modules.size,i=s.modules.data,o=oe.getScale(n,a),l=Math.floor((n+a.margin*2)*o),r=a.margin*o,c=[a.color.light,a.color.dark];for(let u=0;u<l;u++)for(let p=0;p<l;p++){let m=(u*l+p)*4,b=a.color.light;if(u>=r&&p>=r&&u<l-r&&p<l-r){let h=Math.floor((u-r)/o),g=Math.floor((p-r)/o);b=c[i[h*n+g]?1:0]}t[m++]=b.r,t[m++]=b.g,t[m++]=b.b,t[m]=b.a}}});var fn=B(ot=>{var as=ss();function fo(e,t,s){e.clearRect(0,0,t.width,t.height),t.style||(t.style={}),t.height=s,t.width=s,t.style.height=s+"px",t.style.width=s+"px"}function go(){try{return document.createElement("canvas")}catch{throw new Error("You need to specify a canvas element")}}ot.render=function(t,s,a){let n=a,i=s;typeof n>"u"&&(!s||!s.getContext)&&(n=s,s=void 0),s||(i=go()),n=as.getOptions(n);let o=as.getImageWidth(t.modules.size,n),l=i.getContext("2d"),r=l.createImageData(o,o);return as.qrToImageData(r.data,t,n),fo(l,i,o),l.putImageData(r,0,0),i};ot.renderToDataURL=function(t,s,a){let n=a;typeof n>"u"&&(!s||!s.getContext)&&(n=s,s=void 0),n||(n={});let i=ot.render(t,s,n),o=n.type||"image/png",l=n.rendererOpts||{};return i.toDataURL(o,l.quality)}});var yn=B(vn=>{var vo=ss();function gn(e,t){let s=e.a/255,a=t+'="'+e.hex+'"';return s<1?a+" "+t+'-opacity="'+s.toFixed(2).slice(1)+'"':a}function ns(e,t,s){let a=e+t;return typeof s<"u"&&(a+=" "+s),a}function yo(e,t,s){let a="",n=0,i=!1,o=0;for(let l=0;l<e.length;l++){let r=Math.floor(l%t),c=Math.floor(l/t);!r&&!i&&(i=!0),e[l]?(o++,l>0&&r>0&&e[l-1]||(a+=i?ns("M",r+s,.5+c+s):ns("m",n,0),n=0,i=!1),r+1<t&&e[l+1]||(a+=ns("h",o),o=0)):n++}return a}vn.render=function(t,s,a){let n=vo.getOptions(s),i=t.modules.size,o=t.modules.data,l=i+n.margin*2,r=n.color.light.a?"<path "+gn(n.color.light,"fill")+' d="M0 0h'+l+"v"+l+'H0z"/>':"",c="<path "+gn(n.color.dark,"stroke")+' d="'+yo(o,i,n.margin)+'"/>',u='viewBox="0 0 '+l+" "+l+'"',m='<svg xmlns="http://www.w3.org/2000/svg" '+(n.width?'width="'+n.width+'" height="'+n.width+'" ':"")+u+' shape-rendering="crispEdges">'+r+c+`</svg>
`;return typeof a=="function"&&a(null,m),m}});var xn=B(Me=>{var wo=Sa(),is=bn(),wn=fn(),xo=yn();function os(e,t,s,a,n){let i=[].slice.call(arguments,1),o=i.length,l=typeof i[o-1]=="function";if(!l&&!wo())throw new Error("Callback required as last argument");if(l){if(o<2)throw new Error("Too few arguments provided");o===2?(n=s,s=t,t=a=void 0):o===3&&(t.getContext&&typeof n>"u"?(n=a,a=void 0):(n=a,a=s,s=t,t=void 0))}else{if(o<1)throw new Error("Too few arguments provided");return o===1?(s=t,t=a=void 0):o===2&&!t.getContext&&(a=s,s=t,t=void 0),new Promise(function(r,c){try{let u=is.create(s,a);r(e(u,t,a))}catch(u){c(u)}})}try{let r=is.create(s,a);n(null,e(r,t,a))}catch(r){n(r)}}Me.create=is.create;Me.toCanvas=os.bind(null,wn.render);Me.toDataURL=os.bind(null,wn.renderToDataURL);Me.toString=os.bind(null,function(e,t,s){return xo.render(e,s)})});var k={async _req(e,t,s,a=6e4){let n=new AbortController,i=setTimeout(()=>n.abort(),a),o={method:e,headers:{"Content-Type":"application/json"},signal:n.signal};e!=="GET"&&e!=="HEAD"&&(o.headers["X-CSRF-Token"]=window.KP?.csrf??""),s!==void 0&&(o.body=JSON.stringify(s));try{let l=await fetch("/api"+t,o);clearTimeout(i);let r=l.status===204?null:await l.json().catch(()=>null);if(l.status===401)return window.location.href="/login?msg=expired",null;if(!l.ok)throw new Error(r?.error||`HTTP ${l.status}`);return r}catch(l){throw clearTimeout(i),l}},get:e=>k._req("GET",e),post:(e,t,s)=>k._req("POST",e,t,s),put:(e,t,s)=>k._req("PUT",e,t,s),delete:(e,t)=>k._req("DELETE",e,t),patch:(e,t)=>k._req("PATCH",e,t)};var f=e=>String(e).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");function A(e){return e===0?"0 B":e<1024?`${e} B`:e<1048576?`${(e/1024).toFixed(1)} KB`:e<1073741824?`${(e/1048576).toFixed(1)} MB`:`${(e/1073741824).toFixed(2)} GB`}var Ae=()=>'<div class="kp-spinner"><div uk-spinner="ratio: 1.25"></div></div>',R=e=>`<div class="kp-empty">
        <div class="kp-empty-icon" uk-icon="icon: warning; ratio: 2.5"></div>
        <div class="kp-empty-text">${f(e)}</div>
    </div>`,le=(e,t)=>`<div class="kp-empty">
        <div class="kp-empty-icon" uk-icon="icon: ${e}; ratio: 2.5"></div>
        <div class="kp-empty-text">${t}</div>
    </div>`,Y=e=>{let t={1:["running","Running"],2:["stopped","Stopped"],3:["restarting","Restarting"],4:["error","Error"]},[s,a]=t[e]||["stopped","Unknown"];return`<span class="kp-status kp-status-${s}">${a}</span>`},An=e=>({3:"8.2",4:"8.3",5:"8.4",6:"8.5"})[e]||"?",O=e=>({1:"WordPress",2:"PHP",3:"Static",4:"Node.js",5:".NET",6:"Reverse Proxy",7:"Python"})[e]||"?",H=()=>window.KP.user.role===window.KP.roles.admin,Q=e=>{switch(e.SiteType){case 1:case 2:return`PHP ${An(e.PHPVersion)}`;case 4:return`Node ${{2:"22",4:"24",5:"25",6:"26"}[e.RuntimeVersion]||"?"}`;case 5:return`.NET ${{1:"8.0",2:"9.0",3:"10.0"}[e.RuntimeVersion]||"?"}`;case 7:return`Python ${{1:"3.11",2:"3.12",3:"3.13",4:"3.14"}[e.RuntimeVersion]||"?"}`;case 6:return"Reverse Proxy";default:return""}},N=(e,t,s="")=>`<div class="kp-list-card-row">
        <span class="kp-list-card-label">${e}</span>
        <span class="kp-list-card-value ${s}">${t}</span>
    </div>`,Z=e=>({id:e.id??e.ID,uname:e.uname??e.UName,uhash:e.uhash??e.UHash,fname:e.fname??e.FName,lname:e.lname??e.LName,email:e.email??e.Email,phone:e.phone??e.Phone,role:e.role??e.Role,totp_enabled:e.totp_enabled??!1,notify_email:e.notify_email??!1,notify_sms:e.notify_sms??!1,node_uid:e.node_uid??0,blocked:e.blocked??!1,created:e.created??e.Created});function P(e,t){return new Promise(s=>{document.getElementById("kp-confirm-title").textContent=e,document.getElementById("kp-confirm-message").textContent=t;let a=UIkit.modal("#kp-confirm-modal");document.getElementById("kp-confirm-ok").addEventListener("click",()=>{a.hide(),s(!0)},{once:!0}),a.show(),document.getElementById("kp-confirm-modal").addEventListener("hidden",()=>s(!1),{once:!0})})}function I(e,t){let s=`
        <div id="kp-progress-modal" uk-modal="bg-close: false; esc-close: false; keyboard: false">
            <div class="uk-modal-dialog kp-modal uk-modal-body uk-text-center" style="max-width:420px">
                <div uk-spinner="ratio: 1.5" style="color:var(--kp-blue)"></div>
                <h3 class="uk-modal-title uk-margin-small-top" id="kp-progress-title">${e}</h3>
                <p class="kp-muted uk-text-small" id="kp-progress-message">${t}</p>
                <p class="kp-muted">
                    This may take several minutes while the task(s) complete, make sure to keep screen open until it has completed.
                </p>
            </div>
        </div>`;document.body.insertAdjacentHTML("beforeend",s),UIkit.modal("#kp-progress-modal").show()}function T(){let e=document.getElementById("kp-progress-modal");e&&(UIkit.modal(e).hide(),setTimeout(()=>e.remove(),300))}function cs(e){return new Promise(t=>{let s="kp-clone-modal",a=`
            <div id="${s}" uk-modal>
                <div class="uk-modal-dialog kp-modal uk-modal-body" style="max-width:420px">
                    <h3 class="uk-modal-title">Clone Site</h3>
                    <p class="kp-muted uk-text-small uk-margin-small-bottom">
                        Enter a name and domain for the clone of <strong>${e}</strong>.
                        Files, database, and configuration will be copied \u2014 the clone is served on its own domain.
                    </p>
                    <input id="kp-clone-name" class="uk-input kp-input" type="text"
                        placeholder="clone-name" autocomplete="off">
                    <input id="kp-clone-domain" class="uk-input kp-input uk-margin-small-top" type="text"
                        placeholder="staging.example.com" autocomplete="off">
                    <div class="uk-flex uk-flex-right uk-margin-top" style="gap:8px">
                        <button class="uk-button kp-btn-ghost uk-modal-close" id="kp-clone-cancel">Cancel</button>
                        <button class="uk-button kp-btn-primary" id="kp-clone-ok">
                            <span uk-icon="move"></span> Clone
                        </button>
                    </div>
                </div>
            </div>`;document.body.insertAdjacentHTML("beforeend",a);let n=UIkit.modal(`#${s}`),i=document.getElementById("kp-clone-name"),o=document.getElementById("kp-clone-domain"),l=document.getElementById("kp-clone-ok"),r=document.getElementById("kp-clone-cancel"),c=u=>{n.hide(),setTimeout(()=>document.getElementById(s)?.remove(),300),t(u)};l.addEventListener("click",()=>{let u=i.value.trim(),p=o.value.trim();if(!u){i.focus();return}if(!p){o.focus();return}c({name:u,domain:p})}),r.addEventListener("click",()=>c(null),{once:!0}),document.getElementById(s).addEventListener("hidden",()=>c(null),{once:!0}),n.show(),setTimeout(()=>i.focus(),150),[i,o].forEach(u=>u.addEventListener("keydown",p=>{p.key==="Enter"&&l.click()}))})}function ds(e){return new Promise(t=>{let s="kp-rename-modal",a=`
            <div id="${s}" uk-modal>
                <div class="uk-modal-dialog kp-modal uk-modal-body" style="max-width:420px">
                    <h3 class="uk-modal-title">Rename Site</h3>
                    <p class="kp-muted uk-text-small uk-margin-small-bottom">
                        Enter a new name for <strong>${e}</strong>.  Please have patience, this takes a few minutes.
                    </p>
                    <input id="kp-rename-name" class="uk-input kp-input" type="text"
                        value="${e}" autocomplete="off">
                    <div class="uk-flex uk-flex-right uk-margin-top" style="gap:8px">
                        <button class="uk-button kp-btn-ghost uk-modal-close" id="kp-rename-cancel">Cancel</button>
                        <button class="uk-button kp-btn-primary" id="kp-rename-ok">
                            <span uk-icon="pencil"></span> Rename
                        </button>
                    </div>
                </div>
            </div>`;document.body.insertAdjacentHTML("beforeend",a);let n=UIkit.modal(`#${s}`),i=document.getElementById("kp-rename-name"),o=document.getElementById("kp-rename-ok"),l=document.getElementById("kp-rename-cancel"),r=c=>{n.hide(),setTimeout(()=>document.getElementById(s)?.remove(),300),t(c)};o.addEventListener("click",()=>r(i.value.trim()||null),{once:!0}),l.addEventListener("click",()=>r(null),{once:!0}),document.getElementById(s).addEventListener("hidden",()=>r(null),{once:!0}),n.show(),setTimeout(()=>i.focus(),150),i.addEventListener("keydown",c=>{c.key==="Enter"&&o.click()})})}function us(e,t,s){return new Promise(a=>{let n="kp-sync-modal",i=t.map(p=>`<option value="${p.ID}">${p.Name} (${p.ParentID===e.ID?"clone":"parent"})</option>`).join(""),o=`
            <div id="${n}" uk-modal>
                <div class="uk-modal-dialog kp-modal uk-modal-body" style="max-width:460px">
                    <h3 class="uk-modal-title">Push Site</h3>
                    <p class="kp-muted uk-text-small uk-margin-small-bottom">
                        This will overwrite the selected content on the target with data from <strong>${e.Name}</strong>.
                        The target is backed up first, and the push is aborted if that backup fails.
                    </p>
                    <div class="uk-margin-small">
                        <label class="uk-form-label kp-text" for="kp-sync-target">Push To</label>
                        <select id="kp-sync-target" class="uk-select kp-select">${i}</select>
                    </div>
                    <div class="uk-flex uk-margin-small" style="gap:16px">
                        <label><input class="uk-checkbox" type="checkbox" id="kp-sync-files" checked> &nbsp;Files</label>
                        ${s?'<label><input class="uk-checkbox" type="checkbox" id="kp-sync-db" checked> &nbsp;Database</label>':""}
                    </div>
                    <div class="uk-margin-small">
                        <label class="uk-form-label kp-text" for="kp-sync-exclude">Exclude Paths (one per line, relative to the web root)</label>
                        <textarea class="uk-textarea kp-textarea" id="kp-sync-exclude" rows="3" placeholder="wp-content/uploads"></textarea>
                    </div>
                    <p class="kp-muted uk-text-small" style="color:var(--kp-red, #e05c5c)">
                        <span uk-icon="icon: warning; ratio: 0.85"></span>
                        The target will be temporarily unavailable during the push.
                    </p>
                    <div class="uk-flex uk-flex-right uk-margin-top" style="gap:8px">
                        <button class="uk-button kp-btn-ghost uk-modal-close" id="kp-sync-cancel">Cancel</button>
                        <button class="uk-button kp-btn-primary" id="kp-sync-ok">
                            <span uk-icon="cloud-upload"></span> Push Site
                        </button>
                    </div>
                </div>
            </div>`;document.body.insertAdjacentHTML("beforeend",o);let l=UIkit.modal(`#${n}`),r=document.getElementById("kp-sync-ok"),c=document.getElementById("kp-sync-cancel"),u=p=>{l.hide(),setTimeout(()=>document.getElementById(n)?.remove(),300),a(p)};r.addEventListener("click",()=>{let p=parseInt(document.getElementById("kp-sync-target").value,10),m=document.getElementById("kp-sync-files").checked,b=document.getElementById("kp-sync-db")?.checked??!1,h=document.getElementById("kp-sync-exclude").value.split(`
`).map(g=>g.trim()).filter(Boolean);u({target_id:p,files:m,database:b,exclude:h})},{once:!0}),c.addEventListener("click",()=>u(null),{once:!0}),document.getElementById(n).addEventListener("hidden",()=>u(null),{once:!0}),l.show()})}var x={routes:{},_ownHashChange:!1,register(e,t){this.routes[e]=t},async go(e,t={}){let s=Object.keys(t).length?e+"/"+Object.values(t).join("/"):e;this._ownHashChange=!0,window.location.hash=s,setTimeout(()=>{this._ownHashChange=!1},0),document.querySelectorAll(".kp-nav-link").forEach(o=>{o.classList.toggle("kp-active",o.dataset.view===e)}),document.querySelectorAll(".kp-bn-item[data-view]").forEach(o=>{o.classList.toggle("kp-active",o.dataset.view===e)});let a=[...document.querySelectorAll(".kp-bn-more-menu a[data-view]")];a.forEach(o=>o.classList.toggle("kp-dd-active",o.dataset.view===e)),document.getElementById("kp-bn-more")?.classList.toggle("kp-active",a.some(o=>o.dataset.view===e));let n=this.routes[e];if(!n)return;let i=document.getElementById("kp-view");i.innerHTML=Ae();try{await n(i,t)}catch(o){i.innerHTML=R(o.message)}}};function Re(){let t=(window.location.hash.replace("#","")||"dashboard").split("/"),s=t[0],a={};return s==="site-detail"&&t[1]&&(a.id=t[1]),s==="settings"&&t[1]&&(a.tab=t[1]),s==="site-detail"&&t[2]&&(a.tab=t[2]),s==="security"&&t[1]&&(a.tab=t[1]),s==="waf"&&t[1]&&(a.tab=t[1]),{view:s,params:a}}var d={show(e,t="info",s=7e3){let a={success:"check",error:"warning",info:"info"},n=document.createElement("div");n.className=`kp-toast kp-toast-${t}`,n.innerHTML=`<span uk-icon="${a[t]||"info"}"></span><span>${f(e)}</span>`,document.getElementById("kp-toasts").appendChild(n),UIkit.icon(n.querySelector("[uk-icon]")),setTimeout(()=>n.remove(),s)},success:e=>d.show(e,"success"),error:e=>d.show(e,"error"),info:e=>d.show(e,"info")};var Rn=2e3;function Dn(){return`
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
        </div>`}function Hn(e){let t=null,s=!1,a=e.querySelector("#admin-log-output"),n=e.querySelector("#admin-log-connect"),i=e.querySelector("#admin-log-disconnect"),o=e.querySelector("#admin-log-clear"),l=e.querySelector("#admin-log-autoscroll"),r=e.querySelector("#admin-log-status");function c(m){for(m.split(`
`).forEach(b=>{if(!b)return;let h=document.createElement("div");h.className=b.match(/WAF BLOCK/i)?"kp-log-line-err":b.match(/WAF DETECT/i)?"kp-log-line-warn":b.match(/error|crit|emerg/i)?"kp-log-line-err":b.match(/warn/i)?"kp-log-line-warn":b.match(/info|notice/i)?"kp-log-line-info":"",h.textContent=b,a.appendChild(h)});a.childElementCount>Rn;)a.removeChild(a.firstChild);l.checked&&(a.scrollTop=a.scrollHeight)}function u(){t&&(t.close(),t=null),s=!1,n.disabled=!1,i.disabled=!0,r&&(r.textContent="Disconnected")}n.addEventListener("click",()=>{u();let m=e.querySelector("#admin-log-source").value,b=e.querySelector("#admin-log-tail").value,h=location.protocol==="https:"?"wss":"ws",g=m==="waf"?`${h}://${location.host}/api/logs/waf?tail=${b}`:`${h}://${location.host}/api/logs/proxy?tail=${b}`;t=new WebSocket(g),t.onopen=()=>{s=!0,n.disabled=!0,i.disabled=!1,r&&(r.textContent=`Connected \u2014 ${m==="waf"?"WAF Log":"Proxy Access Log"}`)},t.onmessage=v=>c(v.data),t.onerror=()=>{},t.onclose=()=>{s=!1,n.disabled=!1,i.disabled=!0,r&&(r.textContent="Disconnected")}}),i.addEventListener("click",u),o.addEventListener("click",()=>{a.innerHTML=""}),e.querySelector("#admin-log-source").addEventListener("change",()=>{t&&t.readyState===WebSocket.OPEN&&(u(),n.click())});let p=x.go.bind(x);x.go=function(m,b={}){return t&&u(),p(m,b)}}function ps(e){e.innerHTML=Dn(),Hn(e)}var He=50;function Nn(e,t,s){let a=Math.max(1,Math.ceil(e.total/He)),n=(e.entries??[]).map(ms).join("")||'<tr><td colspan="8" class="uk-text-center" style="color:var(--kp-text-dim)">No records found</td></tr>';return`
        <div id="audit-log-panel">
            <div class="kp-view-header">
                <h1 class="kp-view-title" style="font-size:2rem;">Audit Log</h1>
            </div>

            <div class="kp-card uk-padding-small uk-margin-bottom">
                <div class="uk-flex uk-flex-middle uk-flex-wrap kp-filter-bar">
                    <input class="uk-input kp-input" id="al-filter-user" type="text"
                        placeholder="Username" value="${U(t.username)}">
                    <input class="uk-input kp-input" id="al-filter-action" type="text"
                        placeholder="Action" value="${U(t.action)}">
                    <input class="uk-input kp-input" id="al-filter-target" type="text"
                        placeholder="Target type" value="${U(t.target_type)}">
                    <input class="uk-input kp-input" id="al-filter-date-from" type="date"
                        value="${U(t.date_from)}">
                    <input class="uk-input kp-input" id="al-filter-date-to" type="date"
                        value="${U(t.date_to)}">
                    <select class="uk-select kp-select" id="al-filter-auth">
                        <option value=""  ${t.auth===""?"selected":""}>All requests</option>
                        <option value="1" ${t.auth==="1"?"selected":""}>Authenticated</option>
                        <option value="0" ${t.auth==="0"?"selected":""}>Unauthenticated</option>
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
                        ${e.total} record${e.total!==1?"s":""}
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
                    <tbody id="al-table-body">${n}</tbody>
                </table>
                </div>
            </div>

            ${a>1?`<div id="al-pager">${ks(s,a)}</div>`:'<div id="al-pager"></div>'}
        </div>`}function ms(e){let t=new Date(e.ts).toLocaleString(),s=e.username?`<span style="font-family:monospace">${U(e.username)}</span>`:'<span style="color:var(--kp-text-dim)">\u2014</span>',a=Un(e.status),i=e.prior_state||e.new_state?`<button class="uk-button kp-btn-ghost kp-btn-sm al-diff-btn"
                data-prior="${U(e.prior_state)}" data-new="${U(e.new_state)}">
               <span uk-icon="icon: git-fork; ratio: 0.85"></span>
           </button>`:"<span>\u2014</span>",o=e.details?`<button class="uk-button kp-btn-ghost kp-btn-sm al-diff-btn"
                data-prior="" data-new="${U(e.details)}">
               <span uk-icon="icon: info; ratio: 0.85"></span>
           </button>`:"<span>\u2014</span>";return`<tr>
        <td style="white-space:nowrap;font-size:0.82rem">${t}</td>
        <td>${s}</td>
        <td style="font-family:monospace;font-size:0.82rem">${U(e.ip)}</td>
        <td><span class="kp-badge">${U(e.method)}</span></td>
        <td style="font-family:monospace;font-size:0.82rem">${U(e.action)}</td>
        <td>${a}</td>
        <td>${o}</td>
        <td>${i}</td>
    </tr>`}function ks(e,t){let s=e>1?'<button class="uk-button kp-btn-ghost kp-btn-sm" id="al-prev">\u2039 Prev</button>':"",a=e<t?'<button class="uk-button kp-btn-ghost kp-btn-sm" id="al-next">Next \u203A</button>':"";return`<div class="uk-flex uk-flex-middle uk-flex-center uk-margin-small-top" style="gap:12px">
        ${s}
        <span style="font-size:0.85rem;color:var(--kp-text-dim)">Page ${e} of ${t}</span>
        ${a}
    </div>`}function Un(e){return`<span class="kp-badge ${e>=500?"kp-badge-error":e>=400?"kp-badge-warn":e>=300?"kp-badge-info":"kp-badge-ok"}">${e}</span>`}var U=e=>f(e??"");async function bs(e,t){let s=new URLSearchParams({page:t,page_size:He});return e.username&&s.set("username",e.username),e.action&&s.set("action",e.action),e.target_type&&s.set("target_type",e.target_type),e.date_from&&s.set("date_from",e.date_from),e.date_to&&s.set("date_to",e.date_to),e.auth!==""&&s.set("auth",e.auth),k.get(`/audit?${s}`)}function Fn(e){return{username:e.querySelector("#al-filter-user").value.trim(),action:e.querySelector("#al-filter-action").value.trim(),target_type:e.querySelector("#al-filter-target").value.trim(),date_from:e.querySelector("#al-filter-date-from").value,date_to:e.querySelector("#al-filter-date-to").value,auth:e.querySelector("#al-filter-auth").value}}async function Wn(e,t,s){async function a(o,l){let r=await bs(o,l);e.querySelector("#al-table-body").innerHTML=(r.entries??[]).map(ms).join("")||'<tr><td colspan="8" class="uk-text-center kp-text-dim">No records found</td></tr>';let c=Math.max(1,Math.ceil(r.total/He)),u=e.querySelector("#al-pager");u&&(u.innerHTML=c>1?ks(l,c):""),e.querySelector("#al-record-count").textContent=`${r.total} record${r.total!==1?"s":""}`,n(e,o,l,c),t=o,s=l}function n(o,l,r,c){o.querySelector("#al-prev")?.addEventListener("click",()=>a(l,r-1)),o.querySelector("#al-next")?.addEventListener("click",()=>a(l,r+1))}e.querySelector("#al-filter-apply")?.addEventListener("click",()=>{a(Fn(e),1)}),e.querySelector("#al-filter-clear")?.addEventListener("click",()=>{["al-filter-user","al-filter-action","al-filter-target","al-filter-date-from","al-filter-date-to"].forEach(o=>{let l=e.querySelector(`#${o}`);l&&(l.value="")}),e.querySelector("#al-filter-auth").value="",a({username:"",action:"",target_type:"",date_from:"",date_to:"",auth:""},1)});let i=Math.max(1,Math.ceil(parseInt(e.querySelector("#al-record-count")?.textContent??"0")/He));n(e,t,s,i),e.querySelector("#audit-log-panel")?.addEventListener("click",o=>{let l=o.target.closest(".al-diff-btn");if(!l)return;o.preventDefault(),o.stopPropagation();let r=l.dataset.prior??"",c=l.dataset.new??"",u="";r&&c?u=`=== BEFORE ===
`+De(r)+`

=== AFTER ===
`+De(c):c?u=De(c):u=De(r),document.body.insertAdjacentHTML("beforeend",`
            <div id="al-diff-modal-inst" uk-modal>
                <div class="uk-modal-dialog kp-modal uk-modal-body uk-width-large">
                    <button class="uk-modal-close-default" type="button" uk-close></button>
                    <h3 class="kp-view-title uk-margin-bottom">Request Detail</h3>
                    <pre class="kp-cron-output">${U(u)}</pre>
                </div>
            </div>`);let p=document.getElementById("al-diff-modal-inst");UIkit.modal(p).show(),p.addEventListener("hidden",()=>p.remove(),{once:!0})})}function De(e){try{return JSON.stringify(JSON.parse(e),null,2)}catch{return e}}async function hs(e){if(!H()){e.innerHTML=R("Access denied");return}let t={username:"",action:"",target_type:"",date_from:"",date_to:"",auth:""},s=await bs(t,1);e.innerHTML=Nn(s,t,1),Wn(e,t,1)}function Ne(){document.body.insertAdjacentHTML("beforeend",`
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
        </div>`);let t=UIkit.modal("#kp-create-site-modal"),s=document.getElementById("cs-site-type"),a=document.getElementById("cs-php-version-wrap"),n=document.getElementById("cs-node-version-wrap"),i=document.getElementById("cs-dotnet-version-wrap"),o=document.getElementById("cs-python-version-wrap"),l=document.getElementById("cs-start-command-wrap"),r=document.getElementById("cs-wordpress-wrap");t.show();let c=document.getElementById("cs-domains-wrap"),u=document.getElementById("cs-rp-note");s.addEventListener("change",()=>{let p=parseInt(s.value);a.classList.toggle("uk-hidden",p!==1&&p!==2||p===6),n.classList.toggle("uk-hidden",p!==4),i.classList.toggle("uk-hidden",p!==5),o.classList.toggle("uk-hidden",p!==7),l.classList.toggle("uk-hidden",p!==4&&p!==5&&p!==7),l.querySelector("input").required=p===7,r.classList.toggle("uk-hidden",p!==1||p===6),c.classList.toggle("uk-hidden",p===6),u.classList.toggle("uk-hidden",p!==6)}),document.getElementById("create-site-form").addEventListener("submit",async p=>{p.preventDefault();let m=p.target.querySelector('[type="submit"]'),b=m.innerHTML;m.disabled=!0,m.innerHTML='<div uk-spinner="ratio: 0.6"></div> Creating...';let h=new FormData(p.target),g=parseInt(h.get("site_type")),v=null;g===4&&(v=parseInt(h.get("node_version"))),g===5&&(v=parseInt(h.get("dotnet_version"))),g===7&&(v=parseInt(h.get("python_version")));let $={name:h.get("name").trim(),php_version:parseInt(h.get("php_version"))||3,site_type:g,runtime_version:v,start_command:h.get("start_command")?.trim()||"",domains:h.get("domains").split(`
`).map(L=>L.trim()).filter(Boolean),install_wordpress:g===1?h.get("install_wordpress")==="on":!1};t.hide(),document.getElementById("kp-create-site-modal")?.remove();let y=g===6?`Setting up '${$.name}' as a reverse proxy...`:`Setting up '${$.name}' \u2014 pulling images and provisioning containers...`;I("Creating Site",y);try{await k.post("/sites",$,6e5),T(),d.success(`Site '${$.name}' created`),x.go("sites")}catch(L){T(),d.error(L.message),m.disabled=!1,m.innerHTML=b}}),document.getElementById("kp-create-site-modal").addEventListener("hidden",()=>document.getElementById("kp-create-site-modal")?.remove())}function fs(){return vs({title:"Add Node",intro:"On the child node, use Generate Pairing Code, then enter its URL and code here.",okLabel:"Pair",okIcon:"link",fields:`
            <label class="kp-label">Name</label>
            <input id="kp-node-name" class="uk-input kp-input" type="text" maxlength="100" autocomplete="off">
            <label class="kp-label uk-margin-small-top">URL</label>
            <input id="kp-node-url" class="uk-input kp-input" type="text" placeholder="https://node.example.com" autocomplete="off">
            <label class="kp-label uk-margin-small-top">Pairing Code</label>
            <input id="kp-node-code" class="uk-input kp-input" type="text" placeholder="XXXX-XXXX-XXXX-XXXX" autocomplete="off"
                style="letter-spacing:0.2em;text-align:center">`,read:()=>{let e=document.getElementById("kp-node-name"),t=document.getElementById("kp-node-url"),s=document.getElementById("kp-node-code");for(let a of[e,t,s])if(!a.value.trim())return a.focus(),null;return{name:e.value.trim(),url:t.value.trim(),code:s.value.trim()}}})}function gs(e){return vs({title:`Edit Node \u2014 ${f(e.name)}`,intro:"A URL change or re-key opens the child in a new tab to apply it; it takes effect once the child confirms.",okLabel:"Save",okIcon:"pencil",fields:`
            <label class="kp-label">Name</label>
            <input id="kp-node-name" class="uk-input kp-input" type="text" maxlength="100" value="${f(e.name)}" autocomplete="off">
            <label class="kp-label uk-margin-small-top">URL</label>
            <input id="kp-node-url" class="uk-input kp-input" type="text" value="${f(e.url)}" autocomplete="off"
                ${e.status!==2?"disabled":""}>
            <label class="uk-margin-small-top uk-display-block">
                <input id="kp-node-rekey" class="uk-checkbox" type="checkbox" ${e.status!==2?"disabled":""}> &nbsp;Re-key this link
            </label>`,read:()=>{let t=document.getElementById("kp-node-name");return t.value.trim()?{name:t.value.trim(),url:document.getElementById("kp-node-url").value.trim(),rekey:document.getElementById("kp-node-rekey").checked}:(t.focus(),null)}})}function vs({title:e,intro:t,okLabel:s,okIcon:a,fields:n,read:i}){return new Promise(o=>{let l="kp-node-modal";document.getElementById(l)?.remove();let r=`
            <div id="${l}" uk-modal>
                <div class="uk-modal-dialog kp-modal uk-modal-body" style="max-width:460px">
                    <h3 class="uk-modal-title">${e}</h3>
                    <p class="kp-muted uk-text-small uk-margin-small-bottom">${t}</p>
                    ${n}
                    <div class="uk-flex uk-flex-right uk-margin-top" style="gap:8px">
                        <button class="uk-button kp-btn-ghost uk-modal-close" id="kp-node-cancel">Cancel</button>
                        <button class="uk-button kp-btn-primary" id="kp-node-ok">
                            <span uk-icon="${a}"></span> ${s}
                        </button>
                    </div>
                </div>
            </div>`;document.body.insertAdjacentHTML("beforeend",r);let c=document.getElementById(l),u=UIkit.modal(c),p=!1,m=b=>{p||(p=!0,u.hide(),setTimeout(()=>c.remove(),300),o(b))};document.getElementById("kp-node-ok").addEventListener("click",()=>{let b=i();b&&m(b)}),document.getElementById("kp-node-cancel").addEventListener("click",()=>m(null),{once:!0}),c.addEventListener("hidden",()=>m(null),{once:!0}),c.querySelectorAll("input[type=text]").forEach(b=>b.addEventListener("keydown",h=>{h.key==="Enter"&&document.getElementById("kp-node-ok").click()})),u.show(),setTimeout(()=>document.getElementById("kp-node-name")?.focus(),150)})}var Ue=2;async function ee(e){if(!H()){e.innerHTML=R("Access denied");return}let t=await k.get("/nodes");e.innerHTML=`
        <div id="kp-nodes">
            <div class="kp-view-header">
                <h1 class="kp-view-title kp-cursor" style="font-size:2rem;">Nodes</h1>
                <button class="uk-button kp-btn-primary" data-action="node-add">
                    <span uk-icon="plus"></span> Add Node
                </button>
            </div>
            ${t.length?`
            <div class="kp-table-wrap">
                <div class="uk-overflow-auto">
                <table class="uk-table uk-table-divider uk-table-middle uk-margin-remove">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>URL</th>
                            <th>Status</th>
                            <th>Created</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        ${t.map(jn).join("")}
                    </tbody>
                </table>
                </div>
            </div>`:le("server","No child nodes yet")}
        </div>`;let s=document.getElementById("kp-nodes");s.addEventListener("click",a=>zn(a,e,t)),window.addEventListener("focus",()=>{document.getElementById("kp-nodes")===s&&ee(e)},{once:!0})}function jn(e){let t=e.status===Ue?'<span class="kp-status kp-status-running">Paired</span>':'<span class="kp-status kp-status-restarting">Pending</span>';return`<tr>
        <td><strong>${f(e.name)}</strong></td>
        <td><span style="font-family:monospace">${f(e.url)}</span></td>
        <td>${t}</td>
        <td><span class="kp-muted">${f(e.created)}</span></td>
        <td>
            <div class="uk-flex" style="gap:6px;justify-content:flex-end">
                ${e.status===Ue?`
                <button class="uk-button kp-btn-primary kp-btn-sm" data-action="node-open" data-nid="${e.id}" uk-tooltip="Open the Node">
                    <span uk-icon="icon: sign-in;"></span>
                </button>`:""}
                <button class="uk-button kp-btn-ghost kp-btn-sm" data-action="node-edit" data-nid="${e.id}" uk-tooltip="Edit the Node">
                    <span uk-icon="icon: pencil;"></span>
                </button>
                <button class="uk-button kp-btn-secondary kp-btn-sm" data-action="node-remove" data-nid="${e.id}" uk-tooltip="Remove the Node">
                    <span uk-icon="icon: trash;"></span>
                </button>
                ${e.status===Ue?`
                <button class="uk-button kp-btn-danger kp-btn-sm" data-action="node-force-remove" data-nid="${e.id}" uk-tooltip="Force remove without the child">
                    <span uk-icon="icon: ban;"></span>
                </button>`:""}
            </div>
        </td>
    </tr>`}async function zn(e,t,s){let a=e.target.closest("[data-action^='node-']");if(!a)return;e.stopPropagation();let n=s.find(i=>i.id===Number(a.dataset.nid));try{switch(a.dataset.action){case"node-add":{let i=await fs();if(!i)return;let o=await k.post("/nodes",i);re(o.link),d.success("Finish pairing in the new tab"),await ee(t);break}case"node-open":{let i=await k.post(`/nodes/${n.id}/sso`);re(i.link);break}case"node-edit":{let i=await gs(n);if(!i)return;let o=await k.put(`/nodes/${n.id}`,i);o?.link?(re(o.link),d.success("Finish the update in the new tab")):d.success("Node updated"),await ee(t);break}case"node-remove":{let i=n.status===Ue;if(!await P("Remove Node",i?`Unpair ${n.name}? The child opens in a new tab to drop this parent and its synced users.`:`Remove the pending node ${n.name}?`))return;let l=await k.delete(`/nodes/${n.id}`);l?.link?(re(l.link),d.success("Finish unpairing in the new tab")):(d.success("Node removed"),await ee(t));break}case"node-force-remove":{if(!await P("Force Remove Node",`Remove ${n.name} here without contacting it? Only for a child that is gone \u2014 a live child keeps trusting this parent until it is unparented on that host.`))return;await k.delete(`/nodes/${n.id}?force=1`),d.success("Node removed"),await ee(t);break}}}catch(i){d.error(i.message)}}function re(e){let t=document.createElement("a");t.href=e,t.target="_blank",t.rel="noopener noreferrer",document.body.appendChild(t),t.click(),t.remove()}var ce=null;function On(e){return`${e.toFixed(1)}%`}var Fe=null;function pt(){return Fe||(Fe=new Promise(e=>{if(window.Chart){e();return}let t=document.createElement("script");t.src="/static/vendor/chartjs/chart.umd.min.js",t.onload=e,t.onerror=e,document.body.appendChild(t)}),Fe)}function mt(e,t){return`
        <div id="stats-panel" data-site-id="${e}" data-site-type="${t}">

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

            ${t===6?"":`
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

        </div>`}async function Vn(e){await pt();let t;try{t=await k.get(`/sites/${e}/stats/traffic`)}catch(i){document.getElementById("stats-ip-rows").innerHTML=`<tr><td colspan="2" class="kp-muted uk-text-small">Failed to load: ${f(i.message)}</td></tr>`;return}document.getElementById("stats-2xx").textContent=(t.status_codes["2xx"]??0).toLocaleString(),document.getElementById("stats-3xx").textContent=(t.status_codes["3xx"]??0).toLocaleString(),document.getElementById("stats-4xx").textContent=(t.status_codes["4xx"]??0).toLocaleString(),document.getElementById("stats-5xx").textContent=(t.status_codes["5xx"]??0).toLocaleString(),document.getElementById("stats-bandwidth").textContent=A(t.total_bandwidth??0);let s=document.getElementById("stats-chart");if(s&&window.Chart){let i=(t.hits_per_hour??[]).map(l=>new Date(l.hour).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}));ce&&(ce.destroy(),ce=null),ce=new window.Chart(s,{type:"bar",data:{labels:i,datasets:[{label:"2xx",data:(t.hits_per_hour??[]).map(l=>l["2xx"]),backgroundColor:"rgba(39,174,96,0.75)",borderColor:"rgba(39,174,96,1)",borderWidth:1,borderRadius:3},{label:"3xx",data:(t.hits_per_hour??[]).map(l=>l["3xx"]),backgroundColor:"rgba(43,142,255,0.75)",borderColor:"rgba(43,142,255,1)",borderWidth:1,borderRadius:3},{label:"4xx",data:(t.hits_per_hour??[]).map(l=>l["4xx"]),backgroundColor:"rgba(255,171,0,0.75)",borderColor:"rgba(255,171,0,1)",borderWidth:1,borderRadius:3},{label:"5xx",data:(t.hits_per_hour??[]).map(l=>l["5xx"]),backgroundColor:"rgba(235,59,90,0.75)",borderColor:"rgba(235,59,90,1)",borderWidth:1,borderRadius:3}]},options:{responsive:!0,maintainAspectRatio:!1,onClick:(l,r)=>{if(!r||!r.length)return;let c=r[0].datasetIndex,u=ce.data.datasets[c].label;if(u!=="4xx"&&u!=="5xx")return;let p=r[0].index,m=document.getElementById("stats-panel");if(!m||!m._hitsPerHour)return;let b=m._hitsPerHour[p]?.hour;b&&kt(`/sites/${e}/stats/drilldown`,b,u)},onHover:(l,r)=>{if(!r||!r.length){l.native.target.style.cursor="default";return}let c=ce.data.datasets[r[0].datasetIndex].label;l.native.target.style.cursor=c==="4xx"||c==="5xx"?"pointer":"default"},plugins:{legend:{display:!0,labels:{color:"#6b8cae",font:{size:11}},onHover:l=>{l.native.target.style.cursor="pointer"},onLeave:l=>{l.native.target.style.cursor="default"}},tooltip:{mode:"index",backgroundColor:"#0c1530",borderColor:"#1a2a4a",borderWidth:1,titleColor:"#dde8f5",bodyColor:"#6b8cae"}},scales:{x:{stacked:!0,ticks:{color:"#6b8cae",font:{size:10},maxRotation:45},grid:{color:"rgba(26,42,74,0.6)"}},y:{stacked:!0,ticks:{color:"#6b8cae",font:{size:10}},grid:{color:"rgba(26,42,74,0.6)"},beginAtZero:!0}}}});let o=document.getElementById("stats-panel");o&&(o._hitsPerHour=t.hits_per_hour??[])}let a=document.getElementById("stats-ip-rows");a&&(a.innerHTML=(t.top_ips??[]).length===0?'<tr><td colspan="2" class="kp-muted uk-text-small">No data</td></tr>':(t.top_ips??[]).map(i=>`
                <tr>
                    <td class="kp-stats-table-cell-mono">${f(i.name)}</td>
                    <td class="kp-stats-table-cell-count">${i.count.toLocaleString()}</td>
                </tr>`).join(""));let n=document.getElementById("stats-ua-rows");n&&(n.innerHTML=(t.top_uas??[]).length===0?'<tr><td colspan="2" class="kp-muted uk-text-small">No data</td></tr>':(t.top_uas??[]).map(i=>`
                <tr>
                    <td class="kp-stats-ua-cell" title="${f(i.name)}">${f(i.name)}</td>
                    <td class="kp-stats-table-cell-count">${i.count.toLocaleString()}</td>
                </tr>`).join(""))}async function ys(e){let t=document.getElementById("stats-disk-wrap");if(t){t.innerHTML='<div uk-spinner="ratio:0.8" style="color:var(--kp-blue)"></div>';try{let s=await k.get(`/sites/${e}/stats/disk`);t.innerHTML=`
            <div class="uk-grid-small uk-child-width-1-2" uk-grid>
                <div>
                    <div class="kp-stat-card" style="padding:16px">
                        <div class="kp-stat-value kp-stats-disk-val">${A(s.html_bytes??0)}</div>
                        <div class="kp-stat-label">Site Files</div>
                    </div>
                </div>
                <div>
                    <div class="kp-stat-card" style="padding:16px">
                        <div class="kp-stat-value kp-stats-disk-val">${A(s.db_bytes??0)}</div>
                        <div class="kp-stat-label">Database</div>
                    </div>
                </div>
            </div>`}catch(s){t.innerHTML=`<p class="kp-muted uk-text-small">Failed to load disk usage: ${f(s.message)}</p>`}}}function Kn(e){return!e||e.length===0?'<p class="kp-muted uk-text-small uk-margin-remove">No container data.</p>':`
        <table class="uk-table uk-table-small uk-table-divider uk-margin-remove">
            <thead><tr>
                <th style="color:var(--kp-text-dim);font-size:0.75rem">Container</th>
                <th style="color:var(--kp-text-dim);font-size:0.75rem">CPU</th>
                <th style="color:var(--kp-text-dim);font-size:0.75rem">Memory</th>
                <th style="color:var(--kp-text-dim);font-size:0.75rem">Mem %</th>
            </tr></thead>
            <tbody>${e.map(s=>{let a=s.mem_limit>0?(s.mem_used/s.mem_limit*100).toFixed(1):0,n=a>80,i=s.name.split("-").pop();return`
            <tr>
                <td class="kp-stats-pod-role kp-stats-pod-role-btn"
                    data-container="${s.name}"
                    title="Restart ${i}"
                    style="cursor:pointer">${i}</td>
                <td class="kp-stats-pod-cpu${s.cpu_percent>80?" is-hot":""}">
                    ${On(s.cpu_percent)}
                </td>
                <td class="kp-stats-pod-mem">
                    ${A(s.mem_used)}
                    <span class="kp-stats-pod-mem-limit"> / ${A(s.mem_limit)}</span>
                </td>
                <td>
                    <div class="kp-stats-mem-wrap">
                        <div class="kp-stats-mem-bar-track">
                            <div class="kp-stats-mem-bar-fill${n?" is-hot":""}"
                                style="width:${a}%"></div>
                        </div>
                        <span class="kp-stats-mem-pct">${a}%</span>
                    </div>
                </td>
            </tr>`}).join("")}</tbody>
        </table>`}function Jn(e,t,s,a,n){if(!e||e.length===0)return'<p class="kp-muted uk-text-small">No matching requests found.</p>';let i=[...e].sort((p,m)=>{let b,h;switch(s){case"time":b=p.time,h=m.time;break;case"method":b=p.method,h=m.method;break;case"site":b=p.site_name,h=m.site_name;break;case"ip":b=p.client_ip,h=m.client_ip;break;default:b=p.status,h=m.status;break}return b<h?a?1:-1:b>h?a?-1:1:0}),o=50,l=Math.ceil(i.length/o),c=i.slice(t*o,(t+1)*o).map(p=>{let m=f(p.ua),b=p.status>=500?"kp-badge-danger":"kp-badge-warning";return`
            <tr>
                <td class="kp-stats-table-cell-mono" style="white-space:nowrap">${p.time.slice(11,19)}</td>
                ${n?`<td class="kp-stats-table-cell-mono" style="font-size:0.8rem">${f(p.site_name)}</td>`:""}
                <td class="kp-stats-table-cell-mono">${f(p.method)}</td>
                <td style="word-break:break-all;font-size:0.8rem">${f(p.path)}</td>
                <td><span class="kp-badge ${b}">${p.status}</span>${p.reason?` <span class="kp-badge kp-badge-danger" style="font-size:0.65rem" uk-tooltip="Blocked by security rule">${f(p.reason)}</span>`:""}</td>
                <td class="kp-stats-table-cell-mono">${f(p.client_ip)}</td>
                <td class="kp-dd-ua-cell">${m}</td>
            </tr>`}).join(""),u=l>1?`
        <div class="uk-flex uk-flex-between uk-flex-middle uk-margin-small-top">
            <span class="kp-muted uk-text-small">Page ${t+1} of ${l} \u2014 ${e.length} total</span>
            <div>
                ${t>0?`<button class="uk-button kp-btn-ghost kp-btn-sm" data-dd-page="${t-1}">\u2039 Prev</button>`:""}
                ${t<l-1?`<button class="uk-button kp-btn-ghost kp-btn-sm" data-dd-page="${t+1}">Next \u203A</button>`:""}
            </div>
        </div>`:"";return`
        <div class="kp-table-wrap uk-overflow-auto">
            <table class="uk-table uk-table-small uk-table-divider uk-margin-remove">
                <thead><tr>
                    <th style="color:var(--kp-text-dim);font-size:0.75rem;cursor:pointer;user-select:none" data-dd-col="time">Time ${s==="time"?a?"\u2193":"\u2191":"\u2195"}</th>
                    ${n?`<th style="color:var(--kp-text-dim);font-size:0.75rem;cursor:pointer;user-select:none" data-dd-col="site">Site ${s==="site"?a?"\u2193":"\u2191":"\u2195"}</th>`:""}
                    <th style="color:var(--kp-text-dim);font-size:0.75rem;cursor:pointer;user-select:none" data-dd-col="method">Method ${s==="method"?a?"\u2193":"\u2191":"\u2195"}</th>
                    <th style="color:var(--kp-text-dim);font-size:0.75rem">Path</th>
                    <th style="color:var(--kp-text-dim);font-size:0.75rem;cursor:pointer;user-select:none" data-dd-col="status">Status ${s==="status"?a?"\u2193":"\u2191":"\u2195"}</th>
                    <th style="color:var(--kp-text-dim);font-size:0.75rem;cursor:pointer;user-select:none" data-dd-col="ip">IP ${s==="ip"?a?"\u2193":"\u2191":"\u2195"}</th>
                    <th style="color:var(--kp-text-dim);font-size:0.75rem">UA</th>
                </tr></thead>
                <tbody>${c}</tbody>
            </table>
        </div>
        ${u}`}async function kt(e,t,s,a=!1){let n=document.getElementById("stats-drilldown-modal"),i=document.getElementById("stats-drilldown-title"),o=document.getElementById("stats-drilldown-body");if(!n||!o)return;i.textContent=`${s} Requests \u2014 ${new Date(t).toLocaleString([],{hour:"2-digit",minute:"2-digit",month:"short",day:"numeric"})}`,o.innerHTML='<div uk-spinner="ratio:0.8" style="color:var(--kp-blue)"></div>',UIkit.modal(n).show();let l=[],r=0,c="time",u=!0;function p(){o.innerHTML=Jn(l,r,c,u,a),o.querySelectorAll("th[data-dd-col]").forEach(m=>{m.addEventListener("click",()=>{let b=m.dataset.ddCol;c===b?u=!u:(c=b,u=!0),r=0,p()})}),o.querySelectorAll("[data-dd-page]").forEach(m=>{m.addEventListener("click",()=>{r=parseInt(m.dataset.ddPage,10),p()})})}try{l=await k.get(`${e}${e.includes("?")?"&":"?"}hour=${encodeURIComponent(t)}&status=${s}`)}catch(m){o.innerHTML=`<p class="kp-muted uk-text-small">Failed to load: ${f(m.message)}</p>`;return}p()}function bt(e,t,s){let a=s===6,n=null;function i(){if(a)return;let r=e.querySelector("#stats-pod-indicator"),c=e.querySelector("#stats-pod-table-wrap");if(!c)return;let u=location.protocol==="https:"?"wss":"ws";n=new WebSocket(`${u}://${location.host}/api/sites/${t}/stats/pod`),n.onopen=()=>{r&&(r.className="kp-status kp-status-running",r.textContent="Live")},n.onmessage=p=>{try{let m=JSON.parse(p.data);c.innerHTML=Kn(m.containers??[]),c.querySelectorAll(".kp-stats-pod-role-btn").forEach(b=>{b.addEventListener("click",async()=>{let h=b.style.color;b.style.color="var(--kp-warning)";let g=b.dataset.container.split("-").pop();try{await k.post(`/sites/${t}/containers/${g}/restart`),d.success(`${g} restarted`)}catch(v){b.style.color=h,d.error(v.message)}})})}catch{}},n.onerror=()=>{r&&(r.className="kp-status kp-status-error",r.textContent="Error")},n.onclose=()=>{r&&r.textContent==="Live"&&(r.className="kp-status kp-status-stopped",r.textContent="Disconnected")}}function o(){n&&n.readyState===WebSocket.OPEN&&n.close(),n=null}e.querySelector("#stats-disk-refresh")?.addEventListener("click",()=>{ys(t)}),i();let l=new MutationObserver(()=>{document.getElementById("stats-panel")||(o(),l.disconnect())});l.observe(document.getElementById("main")??document.body,{childList:!0,subtree:!1})}async function ht(e,t){let s=t===6;await Vn(e),s||await ys(e)}async function ws(e){let t=await k.get("/sites")??[];e.innerHTML=`
        <div class="kp-view-header">
            <h1 class="kp-view-title kp-cursor" style="font-size:2rem;">Sites</h1>
            <button class="uk-button kp-btn-primary" id="sites-new-btn" uk-tooltip="Create a New Site">
                <span uk-icon="plus"></span> New
            </button>
        </div>

        <!-- bulk action bar \u2014 always visible -->
        <div id="sites-bulk-bar" class="kp-bulk-bar">
            <div class="kp-bulk-actions">
                <input class="uk-checkbox" type="checkbox" id="sites-select-all" uk-tooltip="Select All">
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

            <div class="kp-bulk-tools">
                <!-- line 1: sort + direction + reset -->
                <div class="kp-bulk-tools-row">
                    <div class="uk-inline kp-sites-sort">
                        <a class="uk-form-icon kp-sort-dir kp-sort-asc" href="javascript:void(0)" id="sites-sort-dir"
                           uk-icon="icon: arrow-down-arrow-up" uk-tooltip="Toggle Sort Direction" aria-label="Toggle Sort Direction"></a>
                        <select class="uk-select kp-select kp-input-sm" id="sites-sort" uk-tooltip="Sort">
                            <option value="name" selected>Name</option>
                            <option value="status">Status</option>
                            <option value="type">Type</option>
                            <option value="domain">Domain</option>
                        </select>
                    </div>
                    <button class="uk-button kp-btn-secondary kp-btn-icon kp-btn-sm" id="sites-reset" uk-tooltip="Reset Sort & Filters">
                        <span uk-icon="refresh"></span>
                    </button>
                </div>
                <!-- line 2: type + status filters + search -->
                <div class="kp-bulk-tools-row">
                    <select class="uk-select kp-select kp-input-sm kp-sites-filter" id="sites-type" uk-tooltip="Filter by Type">
                        <option value="" selected>All Types</option>
                        ${[...new Set(t.map(s=>s.SiteType))].sort((s,a)=>O(s).localeCompare(O(a))).map(s=>`<option value="${s}">${O(s)}</option>`).join("")}
                    </select>
                    <select class="uk-select kp-select kp-input-sm kp-sites-filter" id="sites-status" uk-tooltip="Filter by Status">
                        <option value="" selected>All Statuses</option>
                        <option value="1">Running</option>
                        <option value="2">Stopped</option>
                        <option value="3">Restarting</option>
                        <option value="4">Error</option>
                    </select>
                    <div class="uk-inline kp-sites-search">
                        <span class="uk-form-icon" uk-icon="icon: search"></span>
                        <input class="uk-input kp-input kp-input-sm"
                               id="sites-search" type="text" placeholder="Filter sites\u2026" autocomplete="off">
                    </div>
                </div>
            </div>
        </div>

        ${t.length===0?le("world","No sites yet \u2014 create one to get started"):`<div class="kp-list-grid" id="sites-grid">
                ${t.map(s=>Xn(s,t)).join("")}
            </div>`}`,document.getElementById("sites-new-btn").addEventListener("click",()=>Ne()),Gn()}function Xn(e,t=[]){let s=e.Domains?.[0]??null,a=e.SiteType===6,n=e.ParentID>0?t.find(i=>i.ID===e.ParentID)??null:null;return`
        <div class="kp-list-card" data-site-id="${e.ID}" data-status="${a?"":e.SiteStatus}"
             data-type="${e.SiteType}" data-domain="${s??""}">
            <!-- row checkbox + name -->
            <div class="kp-list-card-header">
                <input class="uk-checkbox kp-site-row-check" type="checkbox"
                       data-site-id="${e.ID}" data-site-type="${e.SiteType}">
                <a class="kp-site-row-name" href="javascript:void(0)"
                   data-action="manage" data-id="${e.ID}">${e.Name}</a>
            </div>

            <!-- details -->
            <div class="kp-list-card-body">
                ${a?"":N("Status",Y(e.SiteStatus))}
                ${N("Type",`${O(e.SiteType)}${!a&&Q(e)?" / "+Q(e):""}`,"kp-muted kp-mono")}
                ${N("Port",`:${e.Port}`,"kp-muted kp-mono")}
                ${N("UID",e.HostUID??"\u2014","kp-muted kp-mono")}
                ${N("Domain",s?`<a href="http://${s}" target="_blank"
                          style="color:var(--kp-cyan)">${s}</a>`:'<span class="kp-muted">\u2014</span>')}
                ${n?N("Clone of",`<span uk-icon="icon: git-fork; ratio: 0.7"></span>
                          <a href="javascript:void(0)" data-action="manage" data-id="${n.ID}"
                             style="color:var(--kp-cyan)">${n.Name}</a>`,"kp-mono"):""}
            </div>

            <!-- action buttons -->
            <div class="kp-list-card-actions">
                <button class="uk-button kp-btn-secondary kp-btn-sm"
                        data-action="manage" data-id="${e.ID}"
                        uk-tooltip="Manage">
                    <span uk-icon="icon: cog;"></span>
                </button>
                ${a?"":`
                ${e.SiteStatus===1?`<button class="uk-button kp-btn-secondary kp-btn-sm"
                               data-action="stop" data-id="${e.ID}"
                               uk-tooltip="Stop">
                           <span uk-icon="icon: ban;"></span>
                       </button>`:`<button class="uk-button kp-btn-secondary kp-btn-sm"
                               data-action="start" data-id="${e.ID}"
                               uk-tooltip="Start">
                           <span uk-icon="icon: play;"></span>
                       </button>`}
                <button class="uk-button kp-btn-secondary kp-btn-sm"
                        data-action="restart" data-id="${e.ID}"
                        uk-tooltip="Restart">
                    <span uk-icon="icon: refresh;"></span>
                </button>
                <button class="uk-button kp-btn-secondary kp-btn-sm"
                        data-action="flush" data-id="${e.ID}"
                        uk-tooltip="Flush Caches">
                    <span uk-icon="icon: bolt;"></span>
                </button>
                `}
                <span class="kp-list-card-spacer"></span>
                ${a?"":`
                <button class="uk-button kp-btn-ghost kp-btn-sm kp-btn-recreate"
                        data-action="recreate" data-id="${e.ID}"
                        uk-tooltip="Recreate Pod">
                    <span uk-icon="icon: cloud-download;"></span>
                </button>
                `}
                <button class="uk-button kp-btn-ghost kp-btn-sm kp-btn-recreate"
                        data-action="delete" data-id="${e.ID}"
                        uk-tooltip="Delete">
                    <span uk-icon="icon: trash;"></span>
                </button>
            </div>
        </div>`}function xs(e,t=[]){let s=e.Domains?.[0]??null,a=e.SiteType===6,n=e.ParentID>0?t.find(i=>i.ID===e.ParentID)??null:null;return`
        <div class="kp-site-card uk-margin" data-site-id="${e.ID}" data-status="${a?"":e.SiteStatus}" data-type="${e.SiteType}">
            <div class="kp-site-card-header">
                <div>
                    <h2 class="kp-view-title" data-action="manage" data-id="${e.ID}">${e.Name}</h2>
                    <div class="kp-site-meta">
                        <span class="kp-site-meta-item"><span uk-icon="icon: server; ratio: 0.75"></span> :${e.Port}</span>
                        <span class="kp-site-meta-item"><span uk-icon="icon: code; ratio: 0.75"></span> ${O(e.SiteType)}${!a&&Q(e)?" / "+Q(e):""}</span>
                        ${s?`<span class="kp-site-meta-item" style="width:100%"><a href="http://${s}" target="_blank" style="color:var(--kp-cyan)">${s}</a></span>`:""}
                    </div>
                    ${n?`<div class="kp-site-meta kp-muted uk-text-small uk-margin-small-top"><span uk-icon="icon: git-fork; ratio: 0.75"></span> <a href="javascript:void(0)" data-action="manage" data-id="${n.ID}" style="color:var(--kp-cyan)">${n.Name}</a></div>`:""}
                </div>
                ${a?"":Y(e.SiteStatus)}
            </div>
            <div class="kp-site-actions">
                <button class="uk-button kp-btn-secondary kp-btn-sm" data-action="manage" data-id="${e.ID}" uk-tooltip="Manage This Site"><span uk-icon="icon: cog;"></span></button>
                ${a?"":`
                ${e.SiteStatus===1?`<button class="uk-button kp-btn-secondary kp-btn-sm" data-action="stop" data-id="${e.ID}" uk-tooltip="Stop the Site"><span uk-icon="icon: ban;"></span></button>`:`<button class="uk-button kp-btn-secondary kp-btn-sm" data-action="start" data-id="${e.ID}" uk-tooltip="Start the Site"><span uk-icon="icon: play;"></span></button>`}
                <button class="uk-button kp-btn-secondary kp-btn-sm" data-action="restart" data-id="${e.ID}" uk-tooltip="Restart the Site"><span uk-icon="icon: refresh;"></span></button>
                <button class="uk-button kp-btn-secondary kp-btn-sm" data-action="flush" data-id="${e.ID}" title="Flush cache" uk-tooltip="Flush the Caches"><span uk-icon="icon: bolt;"></span></button>
                <div class="kp-site-actions-break"></div>
                <button class="uk-button kp-btn-ghost kp-btn-sm" data-action="recreate" data-id="${e.ID}" title="Recreate pod" uk-tooltip="Recreate the Pod"><span uk-icon="icon: cloud-download;"></span></button>
                `}
                <button class="uk-button kp-btn-ghost kp-btn-sm" data-action="delete" data-id="${e.ID}" title="Delete" uk-tooltip="Delete the Site"><span uk-icon="icon: trash;"></span></button>
            </div>
        </div>`}function Gn(){let e=document.getElementById("sites-bulk-bar"),t=document.getElementById("sites-bulk-count"),s=document.getElementById("sites-select-all"),a=document.getElementById("sites-search"),n=document.getElementById("sites-sort"),i=document.getElementById("sites-type"),o=document.getElementById("sites-status"),l=document.getElementById("sites-sort-dir"),r=document.getElementById("sites-reset"),c=1,u=document.getElementById("sites-grid");if(!e||!s||!u)return;let p=()=>[...document.querySelectorAll(".kp-site-row-check:checked")],m=()=>[...u.querySelectorAll(".kp-site-row-check")].filter(w=>w.closest(".kp-list-card").style.display!=="none"),b=()=>{let E=p().length;t.textContent=`${E} selected`,["bulk-start","bulk-stop","bulk-restart","bulk-flush","bulk-recreate"].forEach(D=>{let ut=document.getElementById(D);ut&&(ut.disabled=E===0)});let S=document.getElementById("kp-bulk-mobile-btn");S&&(S.disabled=E===0);let C=m();s.indeterminate=E>0&&E<C.length,s.checked=C.length>0&&E===C.length},h=(w,E)=>E==="name"?w.querySelector(".kp-site-row-name")?.textContent.trim().toLowerCase()??"":E==="status"&&w.dataset.type==="6"?"1":(w.dataset[E]??"").toLowerCase(),g=()=>{let w=a.value.trim().toLowerCase(),E=i?.value??"",S=o?.value??"";u.querySelectorAll(".kp-list-card").forEach(C=>{let D=(!w||h(C,"name").includes(w)||h(C,"domain").includes(w))&&(!E||h(C,"type")===E)&&(!S||h(C,"status")===S);C.style.display=D?"":"none",D||(C.querySelector(".kp-site-row-check").checked=!1)}),b()},v=()=>{let w=n?.value??"name",E=[...u.querySelectorAll(".kp-list-card")];E.sort((S,C)=>c*h(S,w).localeCompare(h(C,w),void 0,{numeric:!0})||h(S,"name").localeCompare(h(C,"name"))),E.forEach(S=>u.appendChild(S))},$=w=>{c=w,l?.classList.toggle("kp-sort-asc",w===1),l?.classList.toggle("kp-sort-desc",w===-1)};s.addEventListener("change",()=>{m().forEach(w=>{w.checked=s.checked}),b()}),u.addEventListener("change",w=>{w.target.classList.contains("kp-site-row-check")&&b()}),a?.addEventListener("input",g),n?.addEventListener("change",v),i?.addEventListener("change",g),o?.addEventListener("change",g),l?.addEventListener("click",w=>{w.preventDefault(),$(-c),v()}),r?.addEventListener("click",()=>{a.value="",i&&(i.value=""),o&&(o.value=""),n&&(n.value="name"),$(1),g(),v()}),["bulk-start","bulk-stop","bulk-restart","bulk-flush","bulk-recreate"].forEach(w=>{let E=w.replace("bulk-","");document.getElementById(w)?.addEventListener("click",()=>{let S=p().filter(C=>C.dataset.siteType!=="6").map(C=>C.dataset.siteId);document.dispatchEvent(new CustomEvent("kp:bulk-action",{detail:{action:E,ids:S}}))})});let y=document.getElementById("kp-bulk-mobile-pill"),L=document.getElementById("kp-bulk-mobile-dropdown");document.getElementById("kp-bulk-mobile-btn")?.addEventListener("click",w=>{w.stopPropagation(),L.hidden=!L.hidden}),document.addEventListener("click",w=>{L&&!y?.contains(w.target)&&(L.hidden=!0)},{capture:!0}),["start","stop","restart","flush","recreate"].forEach(w=>{document.getElementById(`bulk-mobile-${w}`)?.addEventListener("click",E=>{E.preventDefault(),L.hidden=!0;let S=p().filter(C=>C.dataset.siteType!=="6").map(C=>C.dataset.siteId);document.dispatchEvent(new CustomEvent("kp:bulk-action",{detail:{action:w,ids:S}}))})}),v(),b()}var de=null,ue=null;function Yn(){ue&&(ue.close(),ue=null);let e=(a,n)=>n>0?`${(a/n*100).toFixed(1)}%`:"\u2014",t=location.protocol==="https:"?"wss":"ws",s=new WebSocket(`${t}://${location.host}/api/stats/host`);ue=s,s.onmessage=a=>{let n=document.getElementById("dash-host-cpu");if(!n){s.close();return}let i;try{i=JSON.parse(a.data)}catch{return}n.textContent=`${(i.cpu_percent??0).toFixed(1)}%`,document.getElementById("dash-host-mem").textContent=e(i.mem_used,i.mem_total),document.getElementById("dash-host-mem-sub").textContent=`${A(i.mem_used??0)} / ${A(i.mem_total??0)}`,document.getElementById("dash-host-disk").textContent=e(i.disk_used,i.disk_total),document.getElementById("dash-host-disk-sub").textContent=`${A(i.disk_used??0)} / ${A(i.disk_total??0)}`,document.getElementById("dash-host-procs").textContent=(i.procs_running??0).toLocaleString(),document.getElementById("dash-host-procs-sub").textContent=`of ${(i.procs_total??0).toLocaleString()} threads`},s.onclose=()=>{ue===s&&(ue=null)}}async function Ss(e,t){if(de&&(de.destroy(),de=null),!e?.hits_per_hour?.length)return;await pt();let s=document.getElementById("dash-traffic-chart");!s||!window.Chart||(de=new window.Chart(s,{type:"bar",data:{labels:e.hits_per_hour.map(a=>new Date(a.hour).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})),datasets:[{label:"2xx",data:e.hits_per_hour.map(a=>a["2xx"]),backgroundColor:"rgba(39,174,96,0.75)",borderColor:"rgba(39,174,96,1)",borderWidth:1,borderRadius:3},{label:"3xx",data:e.hits_per_hour.map(a=>a["3xx"]),backgroundColor:"rgba(43,142,255,0.75)",borderColor:"rgba(43,142,255,1)",borderWidth:1,borderRadius:3},{label:"4xx",data:e.hits_per_hour.map(a=>a["4xx"]),backgroundColor:"rgba(255,171,0,0.75)",borderColor:"rgba(255,171,0,1)",borderWidth:1,borderRadius:3},{label:"5xx",data:e.hits_per_hour.map(a=>a["5xx"]),backgroundColor:"rgba(235,59,90,0.75)",borderColor:"rgba(235,59,90,1)",borderWidth:1,borderRadius:3}]},options:{responsive:!0,maintainAspectRatio:!1,onClick:(a,n)=>{if(!n||!n.length)return;let i=n[0].datasetIndex,o=de.data.datasets[i].label;if(o!=="4xx"&&o!=="5xx")return;let l=e.hits_per_hour[n[0].index]?.hour;l&&kt(`/stats/drilldown?scope=${t}`,l,o,!0)},onHover:(a,n)=>{if(!n||!n.length){a.native.target.style.cursor="default";return}let i=de.data.datasets[n[0].datasetIndex].label;a.native.target.style.cursor=i==="4xx"||i==="5xx"?"pointer":"default"},plugins:{legend:{display:!0,labels:{color:"#6b8cae",font:{size:11}},onHover:a=>{a.native.target.style.cursor="pointer"},onLeave:a=>{a.native.target.style.cursor="default"}},tooltip:{mode:"index",backgroundColor:"#0c1530",borderColor:"#1a2a4a",borderWidth:1,titleColor:"#dde8f5",bodyColor:"#6b8cae"}},scales:{x:{stacked:!0,ticks:{color:"#6b8cae",font:{size:10},maxRotation:45},grid:{color:"rgba(26,42,74,0.6)"}},y:{stacked:!0,ticks:{color:"#6b8cae",font:{size:10}},grid:{color:"rgba(26,42,74,0.6)"},beginAtZero:!0}}}}))}async function $s(e){let[t,s,a]=await Promise.all([k.get("/sites").catch(()=>[]),k.get("/stats/traffic").catch(()=>null),window.KP?.user?.role===99?k.get("/nodes").catch(()=>[]):[]]),n=t.filter(c=>c.SiteType!==6&&c.SiteStatus===1).length,i=t.filter(c=>c.SiteType===6).length,o=t.filter(c=>c.SiteType!==6&&c.SiteStatus===4).length,l=window.KP?.user?.role===99,r=a.filter(c=>c.status===2);e.innerHTML=`

        <!-- global counts -->
        <div class="kp-view-header">
            <h1 class="kp-view-title kp-cursor" style="font-size:2rem;">Dashboard</h1>
        </div>
        <div class="uk-grid-small uk-child-width-1-2 uk-child-width-1-4@m uk-margin-medium-bottom" uk-grid>
            <div>
                <div class="kp-stat-card">
                    <div class="uk-flex uk-flex-between">
                        <div>
                            <div class="kp-stat-value">${t.length}</div>
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
                            <div class="kp-stat-value" style="color:var(--kp-danger)">${o}</div>
                            <div class="kp-stat-label">Errors</div>
                        </div>
                        <span style="color:var(--kp-danger)" uk-icon="icon: warning; ratio: 1.75"></span>
                    </div>
                </div>
            </div>
        </div>

        <!-- live host usage \u2014 admin only -->
        ${l?`
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
        
        <!-- paired nodes \u2014 admin only -->
        ${r.length?`
        <div class="uk-flex uk-flex-wrap uk-margin-medium-bottom" id="dash-nodes" style="gap:8px">
            ${r.map(c=>`
            <button class="uk-button kp-btn-primary kp-btn-sm" data-action="dash-node-open" data-nid="${c.id}" uk-tooltip="Open the Node">
                <span uk-icon="icon: sign-in;"></span> ${f(c.name)}
            </button>`).join("")}
        </div>
        `:""}

        <!-- global traffic -->
        <div class="kp-view-header uk-margin-top">
            <h2 class="kp-view-title" style="font-size:1.25rem">Traffic
                <span class="kp-muted uk-text-small" style="font-weight:400"> \u2014 last 24 hours</span>
            </h2>
            ${l?`
            <div id="dash-traffic-scope" class="uk-flex" style="gap:6px">
                ${[["all","All"],["sites","Sites"],["panel","Panel"]].map(([c,u])=>`
                <button class="uk-button ${c==="all"?"kp-btn-primary":"kp-btn-ghost"} kp-btn-sm"
                    data-action="dash-scope" data-scope="${c}">${u}</button>`).join("")}
            </div>
            `:""}
        </div>
        <div class="kp-card uk-padding-small uk-margin-medium-bottom">
            <div class="uk-grid-small uk-child-width-1-2 uk-child-width-1-4@m uk-margin-small-bottom" uk-grid>
                <div><div class="kp-stat-card" style="padding:16px">
                    <div class="kp-stat-value" id="dash-traffic-2xx" style="font-size:1.6rem;color:var(--kp-success)">
                        ${(s?.status_codes?.["2xx"]??0).toLocaleString()}
                    </div>
                    <div class="kp-stat-label" style="color:var(--kp-success)">2xx Success</div>
                </div></div>
                <div><div class="kp-stat-card" style="padding:16px">
                    <div class="kp-stat-value" id="dash-traffic-3xx" style="font-size:1.6rem;color:var(--kp-cyan)">
                        ${(s?.status_codes?.["3xx"]??0).toLocaleString()}
                    </div>
                    <div class="kp-stat-label" style="color:var(--kp-cyan)">3xx Redirect</div>
                </div></div>
                <div><div class="kp-stat-card" style="padding:16px">
                    <div class="kp-stat-value" id="dash-traffic-4xx" style="font-size:1.6rem;color:var(--kp-warning)">
                        ${(s?.status_codes?.["4xx"]??0).toLocaleString()}
                    </div>
                    <div class="kp-stat-label" style="color:var(--kp-warning)">4xx Client Err</div>
                </div></div>
                <div><div class="kp-stat-card" style="padding:16px">
                    <div class="kp-stat-value" id="dash-traffic-5xx" style="font-size:1.6rem;color:var(--kp-danger)">
                        ${(s?.status_codes?.["5xx"]??0).toLocaleString()}
                    </div>
                    <div class="kp-stat-label" style="color:var(--kp-danger)">5xx Server Err</div>
                </div></div>
            </div>
            <div class="uk-margin-small-bottom" style="color:var(--kp-text-dim);font-size:0.85rem">
                Total Bandwidth:
                <span id="dash-traffic-bw" style="color:var(--kp-cyan);font-family:'JetBrains Mono',monospace">
                    ${A(s?.total_bandwidth??0)}
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
                    ${t.length===0?emptyState("world","No sites yet"):t.slice(-3).reverse().map(c=>xs(c,t)).join("")}
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
                            ${(s?.top_sites??[]).length===0?'<tr><td colspan="2" class="kp-muted uk-text-small">No traffic data</td></tr>':(s?.top_sites??[]).map(c=>`
                                    <tr>
                                        <td class="kp-mono" style="font-size:0.8rem">${f(c.name)}</td>
                                        <td style="text-align:right;color:var(--kp-cyan);
                                            font-family:'JetBrains Mono',monospace;font-size:0.8rem">
                                            ${c.count.toLocaleString()}
                                        </td>
                                    </tr>`).join("")}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        `,l&&Yn(),document.getElementById("dash-nodes")?.addEventListener("click",async c=>{let u=c.target.closest('[data-action="dash-node-open"]');if(u)try{let p=await k.post(`/nodes/${u.dataset.nid}/sso`);re(p.link)}catch(p){d.error(p.message)}}),await Ss(s,"all"),document.getElementById("dash-traffic-scope")?.addEventListener("click",async c=>{let u=c.target.closest('[data-action="dash-scope"]');if(!u||u.classList.contains("kp-btn-primary"))return;let p=u.dataset.scope,m;try{m=await k.get(`/stats/traffic?scope=${p}`)}catch(b){d.error(b.message);return}u.parentElement.querySelectorAll('[data-action="dash-scope"]').forEach(b=>{b.classList.toggle("kp-btn-primary",b===u),b.classList.toggle("kp-btn-ghost",b!==u)});for(let b of["2xx","3xx","4xx","5xx"])document.getElementById(`dash-traffic-${b}`).textContent=(m?.status_codes?.[b]??0).toLocaleString();document.getElementById("dash-traffic-bw").textContent=A(m?.total_bandwidth??0),await Ss(m,p)}),document.getElementById("dash-new-site")?.addEventListener("click",()=>Ne())}function xe(e=null){let t=e?`/sites/${e}/security/ip`:"/security/ip",s=e?`/sites/${e}/security/ua`:"/security/ua",a=e?`/sites/${e}/security/country`:"/security/country",n=e?`/sites/${e}/security/asn`:"/security/asn";return`
        <div id="security-panel" data-ip-base="${t}" data-ua-base="${s}" data-geo-base="${a}" data-asn-base="${n}" ${e?`data-site-id="${e}"`:""}>

            <!-- tab pills -->
            <ul class="kp-tab-pills" id="kp-sec-pills">
                <li data-tab="ip"><a href="#"><span uk-icon="icon: location; ratio: 0.85"></span> IP Rules</a></li>
                <li data-tab="ua"><a href="#"><span uk-icon="icon: laptop; ratio: 0.85"></span> User-Agent</a></li>
                <li data-tab="country"><a href="#"><span uk-icon="icon: world; ratio: 0.85"></span> Country</a></li>
                <li data-tab="asn"><a href="#"><span uk-icon="icon: server; ratio: 0.85"></span> ASN</a></li>
                ${e?`
                <li data-tab="malware"><a href="#"><span uk-icon="icon: bolt; ratio: 0.85"></span> Malware</a></li>
                `:""}
                ${e?"":`
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
                                <a class="uk-button kp-btn-ghost kp-btn-sm" href="/api${t}/export" download="${e?`site-${e}-ip-rules.csv`:"podnest-global-ip-rules.csv"}" uk-tooltip="Export IP rules as CSV">
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
                                <a class="uk-button kp-btn-ghost kp-btn-sm" href="/api${s}/export" download="${e?`site-${e}-ua-rules.csv`:"podnest-global-ua-rules.csv"}" uk-tooltip="Export UA rules as CSV">
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

                ${e?`
                <!-- malware scans -->
                <li>
                    <div class="kp-card uk-padding-small">
                        <div class="uk-flex uk-flex-between uk-flex-middle uk-margin-small-bottom">
                            <h3 class="kp-view-title">Malware Scans</h3>
                            <div class="uk-flex" style="gap:8px">
                                <button class="uk-button kp-btn-primary kp-btn-sm" id="sec-malware-scan" uk-tooltip="Scan this site now" disabled>
                                    <span uk-icon="search"></span>
                                </button>
                            </div>
                        </div>
                        <p class="kp-muted uk-text-small uk-margin-small-bottom">
                            The site's html directory is scanned nightly at midnight with ClamAV and Linux Malware Detect.
                            Findings are reported only \u2014 quarantine moves a file out of
                            the site and out of SFTP reach. History is kept for <span id="sec-malware-retain">30</span> days.
                        </p>
                        <div id="sec-malware-list">
                            <div uk-spinner="ratio: 0.6"></div>
                        </div>
                    </div>
                </li>
                `:""}

                ${e?"":`
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
        </div>`}function je(e,t){let s=e.querySelector("#security-panel"),a=e.querySelector("#kp-sec-pills"),n=e.querySelector("#kp-sec-switcher");if(!s||!a||!n)return;let i=s.dataset.siteId,o=[...a.querySelectorAll(":scope > li")],l=(r,c)=>{if(UIkit.switcher(n).show(r),o.forEach((p,m)=>p.classList.toggle("kp-pill-active",m===r)),!c)return;let u=o[r].dataset.tab;history.replaceState(null,"",i?`#site-detail/${i}/${u}`:r===0?"#security":`#security/${u}`)};o.forEach((r,c)=>{r.querySelector(":scope > a").addEventListener("click",u=>{u.preventDefault(),l(c,!0)})}),l(Math.max(0,o.findIndex(r=>r.dataset.tab===t)),!1)}async function te(e){let t=e.querySelector("#security-panel");if(!t)return;let s=t.dataset.ipBase,a=t.dataset.uaBase;try{let n=t.dataset.geoBase,i=t.dataset.asnBase,o=[k.get(s),k.get(a),k.get(n),k.get(i)];t.dataset.siteId||o.push(k.get("/settings/trusted-proxies"),k.get("/security/bypass"));let[l,r,c,u,p,m]=await Promise.all(o);if(!e.querySelector("#sec-ip-whitelist"))return;if(e.querySelector("#sec-ip-whitelist").value=l.whitelist??"",e.querySelector("#sec-ip-blacklist").value=l.blacklist??"",e.querySelector("#sec-ua-whitelist").value=r.whitelist??"",e.querySelector("#sec-ua-blacklist").value=r.blacklist??"",e.querySelector("#sec-geo-whitelist").value=c.whitelist??"",e.querySelector("#sec-geo-blacklist").value=c.blacklist??"",e.querySelector("#sec-asn-whitelist").value=u.whitelist??"",e.querySelector("#sec-asn-blacklist").value=u.blacklist??"",p){let b=e.querySelector("#sec-tp-cidrs");b&&(b.value=p.trusted_proxies_custom??"")}if(m){let b=e.querySelector("#sec-bypass-cidrs");b&&(b.value=m.bypass??"")}}catch(n){d.error("Failed to load security rules: "+n.message)}t.dataset.siteId&&We(e,t.dataset.siteId)}var Qn={1:["restarting","Running"],2:["running","Clean"],3:["error","Infected"],4:["stopped","Failed"]},Es=null;function Zn(e){return e.scannable?e.scans.length?`
        <div class="uk-overflow-auto">
        <table class="uk-table uk-table-small uk-table-divider uk-margin-remove">
            <thead>
                <tr>
                    <th>Started</th>
                    <th>Trigger</th>
                    <th>Status</th>
                    <th>Files</th>
                    <th>Hits</th>
                </tr>
            </thead>
            <tbody>${e.scans.map(s=>{let[a,n]=Qn[s.status]||["stopped","Unknown"],i=s.status===1,o=(s.findings||[]).map(l=>`
            <tr>
                <td colspan="4" style="padding-left:24px">
                    <div class="kp-mono" style="font-size:0.8rem">${f(l.path)}</div>
                    <div class="kp-muted uk-text-small">${f(l.signature)}</div>
                </td>
                <td>
                    ${l.quarantined?'<span class="kp-muted uk-text-small">Quarantined</span>':`<button class="uk-button kp-btn-danger kp-btn-sm sec-malware-quarantine" data-id="${l.id}" uk-tooltip="Move this file into quarantine">
                               <span uk-icon="lock"></span>
                           </button>`}
                </td>
            </tr>`).join("");return`
            <tr>
                <td>${new Date(s.started).toLocaleString()}</td>
                <td>${s.trigger==="manual"?"Manual":"Scheduled"}</td>
                <td>
                    <span class="kp-status kp-status-${a}">${n}</span>
                    ${s.error?`<div class="kp-muted uk-text-small">${f(s.error)}</div>`:""}
                </td>
                <td>${i?"\u2014":s.files_scanned}</td>
                <td>${i?"\u2014":s.infected}</td>
            </tr>${o}`}).join("")}</tbody>
        </table>
        </div>`:'<p class="kp-muted uk-text-small uk-margin-remove">No scans yet.</p>':'<p class="kp-muted uk-text-small uk-margin-remove">This site has no html directory to scan.</p>'}async function We(e,t){if(clearTimeout(Es),!!e.querySelector("#sec-malware-list"))try{let s=await k.get(`/sites/${t}/malware`),a=e.querySelector("#sec-malware-list");if(!a)return;let n=s.scans.some(i=>i.status===1);a.innerHTML=Zn(s),e.querySelector("#sec-malware-scan").disabled=!s.scannable||n,e.querySelector("#sec-malware-retain").textContent=s.retain_days,n&&(Es=setTimeout(()=>We(e,t),1e4))}catch(s){d.error("Failed to load malware scans: "+s.message)}}function ze(e){let t=e.querySelector("#security-panel");if(!t)return;let s=t.dataset.ipBase,a=t.dataset.uaBase,n=t.dataset.geoBase;e.querySelector("#sec-ip-save")?.addEventListener("click",async()=>{let i=e.querySelector("#sec-ip-save"),o=i.innerHTML;i.disabled=!0,i.innerHTML='<div uk-spinner="ratio: 0.5"></div>';try{await k.put(s,{whitelist:e.querySelector("#sec-ip-whitelist").value,blacklist:e.querySelector("#sec-ip-blacklist").value}),d.success("IP rules saved")}catch(l){d.error(l.message)}finally{i.disabled=!1,i.innerHTML=o}}),e.querySelector("#sec-ua-save")?.addEventListener("click",async()=>{let i=e.querySelector("#sec-ua-save"),o=i.innerHTML;i.disabled=!0,i.innerHTML='<div uk-spinner="ratio: 0.5"></div>';try{await k.put(a,{whitelist:e.querySelector("#sec-ua-whitelist").value,blacklist:e.querySelector("#sec-ua-blacklist").value}),d.success("UA rules saved")}catch(l){d.error(l.message)}finally{i.disabled=!1,i.innerHTML=o}}),e.querySelector("#sec-geo-save")?.addEventListener("click",async()=>{let i=e.querySelector("#sec-geo-save"),o=i.innerHTML;i.disabled=!0,i.innerHTML='<div uk-spinner="ratio: 0.5"></div>';try{let l={whitelist:e.querySelector("#sec-geo-whitelist").value,blacklist:e.querySelector("#sec-geo-blacklist").value},r=await k.put(n,l);r?.status==="confirm"&&(await UIkit.modal.confirm(`${r.reason}. Save anyway?`),r=await k.put(n,{...l,confirm:!0})),d.success("Country rules saved")}catch(l){l instanceof Error&&d.error(l.message)}finally{i.disabled=!1,i.innerHTML=o}}),e.querySelector("#sec-asn-save")?.addEventListener("click",async()=>{let i=e.querySelector("#sec-asn-save"),o=i.innerHTML;i.disabled=!0,i.innerHTML='<div uk-spinner="ratio: 0.5"></div>';try{let l=e.querySelector("#security-panel").dataset.asnBase,r={whitelist:e.querySelector("#sec-asn-whitelist").value,blacklist:e.querySelector("#sec-asn-blacklist").value},c=await k.put(l,r);c?.status==="confirm"&&(await UIkit.modal.confirm(`${c.reason}. Save anyway?`),c=await k.put(l,{...r,confirm:!0})),d.success("ASN rules saved")}catch(l){l instanceof Error&&d.error(l.message)}finally{i.disabled=!1,i.innerHTML=o}}),e.querySelector("#sec-asn-lookup")?.addEventListener("click",()=>ei(e)),e.querySelector("#sec-malware-scan")?.addEventListener("click",async()=>{let i=e.querySelector("#sec-malware-scan"),o=i.innerHTML;i.disabled=!0,i.innerHTML='<div uk-spinner="ratio: 0.5"></div>';try{await k.post(`/sites/${t.dataset.siteId}/malware/scan`),d.success("Malware scan queued"),await We(e,t.dataset.siteId)}catch(l){d.error(l.message),i.disabled=!1}finally{i.innerHTML=o}}),e.querySelector("#sec-malware-list")?.addEventListener("click",async i=>{let o=i.target.closest(".sec-malware-quarantine");if(!(!o||!await P("Quarantine File","This moves the file out of the site's html directory. If it is legitimately needed, the site may break. Continue?"))){o.disabled=!0,o.innerHTML='<div uk-spinner="ratio: 0.5"></div>';try{await k.post(`/sites/${t.dataset.siteId}/malware/findings/${o.dataset.id}/quarantine`),d.success("File quarantined")}catch(r){d.error(r.message)}finally{await We(e,t.dataset.siteId)}}}),e.querySelector("#sec-tp-save")?.addEventListener("click",async()=>{let i=e.querySelector("#sec-tp-save"),o=i.innerHTML;i.disabled=!0,i.innerHTML='<div uk-spinner="ratio: 0.5"></div>';try{await k.put("/settings/trusted-proxies",{trusted_proxies_custom:e.querySelector("#sec-tp-cidrs").value.trim()}),d.success("Trusted proxy ranges saved")}catch(l){d.error(l.message)}finally{i.disabled=!1,i.innerHTML=o}}),e.querySelector("#sec-bypass-save")?.addEventListener("click",async()=>{let i=e.querySelector("#sec-bypass-save"),o=i.innerHTML;i.disabled=!0,i.innerHTML='<div uk-spinner="ratio: 0.5"></div>';try{await k.put("/security/bypass",{bypass:e.querySelector("#sec-bypass-cidrs").value.trim()}),d.success("Bypass rules saved")}catch(l){d.error(l.message)}finally{i.disabled=!1,i.innerHTML=o}}),e.querySelector("#sec-tp-import")?.addEventListener("change",async i=>{let o=i.target.files[0];if(!o)return;let l=new FormData;l.append("file",o);try{let r=await fetch("/api/settings/trusted-proxies/import",{method:"POST",headers:{"X-CSRF-Token":window.KP?.csrf??""},body:l}),c=r.status===204?null:await r.json().catch(()=>null);if(!r.ok)throw new Error(c?.error||`HTTP ${r.status}`);await te(e),d.success("Trusted proxies imported")}catch(r){d.error(r.message)}finally{i.target.value=""}}),e.querySelector("#sec-ip-import")?.addEventListener("change",async i=>{let o=i.target.files[0];if(!o)return;let l=new FormData;l.append("file",o);try{let r=await fetch("/api"+s+"/import",{method:"POST",headers:{"X-CSRF-Token":window.KP?.csrf??""},body:l}),c=r.status===204?null:await r.json().catch(()=>null);if(!r.ok)throw new Error(c?.error||`HTTP ${r.status}`);await te(e),d.success("IP rules imported")}catch(r){d.error(r.message)}finally{i.target.value=""}}),e.querySelector("#sec-ua-import")?.addEventListener("change",async i=>{let o=i.target.files[0];if(!o)return;let l=new FormData;l.append("file",o);try{let r=await fetch("/api"+a+"/import",{method:"POST",headers:{"X-CSRF-Token":window.KP?.csrf??""},body:l}),c=r.status===204?null:await r.json().catch(()=>null);if(!r.ok)throw new Error(c?.error||`HTTP ${r.status}`);await te(e),d.success("UA rules imported")}catch(r){d.error(r.message)}finally{i.target.value=""}})}function ei(e){document.getElementById("kp-asn-lookup-modal")?.remove(),document.body.insertAdjacentHTML("beforeend",`
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
        </div>`);let s=UIkit.modal("#kp-asn-lookup-modal");s.show();let a=e.querySelector("#security-panel")?.dataset.siteId,n=a?`/sites/${a}/security/asn/lookup`:"/security/asn/lookup",i=async()=>{let o=document.getElementById("asn-lookup-q").value.trim();if(!o)return;let l=document.getElementById("asn-lookup-result");l.innerHTML='<div uk-spinner="ratio: 0.5"></div>';try{let r=await k.get(`${n}?q=${encodeURIComponent(o)}`);if(!r?.asn){l.innerHTML='<p class="kp-muted uk-text-small">No ASN found for <span class="kp-mono"></span>.</p>',l.querySelector(".kp-mono").textContent=r?.ip||o;return}l.innerHTML=`
                <p class="uk-text-small">
                    <span class="kp-mono" id="asn-lookup-ip"></span> \u2192
                    <span class="kp-mono">AS${r.asn}</span>
                    <span id="asn-lookup-org"></span>
                    ${r.country?`<span class="kp-muted">(${r.country})</span>`:""}
                </p>
                <button class="uk-button kp-btn-ghost kp-btn-sm" id="asn-lookup-add">
                    <span uk-icon="ban"></span> Add AS${r.asn} to blacklist
                </button>`,l.querySelector("#asn-lookup-ip").textContent=r.ip,l.querySelector("#asn-lookup-org").textContent=r.org||"",l.querySelector("#asn-lookup-add").addEventListener("click",()=>{let c=e.querySelector("#sec-asn-blacklist"),u=`AS${r.asn}`;c.value.split(`
`).some(p=>p.trim().toUpperCase()===u)||(c.value=c.value.trim()?`${c.value.replace(/\s+$/,"")}
${u}`:u),s.hide(),d.success(`${u} added to blacklist \u2014 save to apply`)})}catch(r){l.innerHTML="",d.error(r.message)}};document.getElementById("asn-lookup-go").addEventListener("click",i),document.getElementById("asn-lookup-q").addEventListener("keydown",o=>{o.key==="Enter"&&i()})}async function Ts(e,t={}){if(!H()){e.innerHTML=R("Access denied");return}e.innerHTML=`
        <div class="kp-view-header">
            <h1 class="kp-view-title kp-cursor" style="font-size:2rem;">Global Security</h1>
        </div>
        <p class="kp-muted uk-text-small uk-margin-bottom">
            Global rules apply to all sites before per-site rules are evaluated.
            Blacklist always wins \u2014 except for IP rules, where a whitelist match
            in either scope allows the request outright.
        </p>
        ${xe(null)}`,ze(e),je(e,t.tab),te(e)}function ti(e){switch(e){case"valid":return'<span class="kp-ssl-valid" uk-icon="icon: lock; ratio: 0.85" uk-tooltip="Valid SSL certificate"></span>';case"self-signed":return'<span class="kp-ssl-self-signed" uk-icon="icon: lock; ratio: 0.85" uk-tooltip="Self-signed certificate"></span>';case"expired":return'<span class="kp-ssl-none" uk-icon="icon: warning; ratio: 0.85" uk-tooltip="Expired certificate"></span>';case"mismatch":return'<span class="kp-ssl-none" uk-icon="icon: warning; ratio: 0.85" uk-tooltip="Certificate does not match this domain"></span>';default:return'<span class="kp-ssl-none" uk-icon="icon: warning; ratio: 0.85" uk-tooltip="No SSL certificate"></span>'}}async function Ls(e){let t=document.getElementById("admin-domain-ssl");if(!(!t||!e))try{let s=await k.get(`/ssl-status?domain=${encodeURIComponent(e)}`);t.outerHTML=ti(s.status)}catch{}}var Cs=["general","backups","notifications","malware"];function Oe(e){return`
        <div class="uk-flex" style="gap:8px">
            <a class="uk-button kp-btn-ghost kp-btn-sm" href="/api/settings/export?group=${e}" download="podnest-settings-${e}.csv" uk-tooltip="Export these settings">
                <span uk-icon="download"></span>
            </a>
            <label class="uk-button kp-btn-ghost kp-btn-sm" style="cursor:pointer" uk-tooltip="Import these settings from CSV">
                <span uk-icon="upload"></span>
                <input type="file" class="kp-settings-import" data-group="${e}" accept=".csv" style="display:none">
            </label>
        </div>`}async function ft(e,t={}){if(!H()){e.innerHTML=R("Access denied");return}let[s,a,n,i,o]=await Promise.all([k.get("/settings"),k.get("/settings/backup"),k.get("/settings/notifications"),k.get("/settings/resources"),k.get("/settings/malware")]);e.innerHTML=`
    <div class="kp-view-header">
        <h1 class="kp-view-title kp-cursor" style="font-size:2rem;">Settings</h1>
    </div>

    <!-- tab pills -->
    <ul class="kp-tab-pills" id="kp-settings-pills">
        <li data-pill="0"><a href="#"><span uk-icon="icon: cog; ratio: 0.85"></span> General</a></li>
        <li data-pill="1"><a href="#"><span uk-icon="icon: cloud-upload; ratio: 0.85"></span> Backups</a></li>
        <li data-pill="2"><a href="#"><span uk-icon="icon: bell; ratio: 0.85"></span> Notifications</a></li>
        <li data-pill="3"><a href="#"><span uk-icon="icon: bolt; ratio: 0.85"></span> Malware</a></li>
    </ul>

    <!-- switcher panels -->
    <ul class="uk-switcher uk-margin-large-bottom" id="kp-settings-switcher">

        <!-- general: panel configuration + host resource watcher -->
        <li>
            <div class="kp-card uk-padding">
                <div class="uk-flex uk-flex-right uk-margin-bottom">
                    ${Oe("general")}
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
                                value="${s.admin_domain??""}">
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
                                value="${i.resource_ram_reserve_gb??"2"}">
                            <p class="kp-muted uk-text-small uk-margin-small-top">
                                Amount of RAM to keep free for the host OS. Throttling fires when aggregate pod usage exceeds total RAM minus this value.
                            </p>
                        </div>
                        <div>
                            <label class="kp-label" for="resource-poll-interval">Poll Interval (seconds)</label>
                            <input class="uk-input kp-input" id="resource-poll-interval" name="resource_poll_interval" type="number"
                                min="5" max="300" step="5" placeholder="30"
                                value="${i.resource_poll_interval??"30"}">
                        </div>
                        <div>
                            <label class="kp-label" for="resource-throttle-pct">Throttle Aggressiveness (%)</label>
                            <input class="uk-input kp-input" id="resource-throttle-pct" name="resource_throttle_pct" type="number"
                                min="10" max="90" step="5" placeholder="50"
                                value="${i.resource_throttle_pct??"50"}">
                            <p class="kp-muted uk-text-small uk-margin-small-top">
                                Percentage to reduce the offending pod's current memory usage by when throttling.
                            </p>
                        </div>
                        <div>
                            <label class="kp-label" for="shutdown-job-timeout">Shutdown Job Drain (minutes)</label>
                            <input class="uk-input kp-input" id="shutdown-job-timeout" name="shutdown_job_timeout" type="number"
                                min="1" max="60" step="1" placeholder="5"
                                value="${i.shutdown_job_timeout??"5"}">
                            <p class="kp-muted uk-text-small uk-margin-small-top">
                                How long to wait for in-flight backups, restores, and imports to finish before the process exits on stop or restart.
                            </p>
                        </div>
                        <div class="uk-width-1-1">
                            <label class="kp-label" for="resource-webhook-url">Webhook URL <span class="kp-muted">(optional)</span></label>
                            <input class="uk-input kp-input kp-mono" id="resource-webhook-url" name="resource_webhook_url" type="url"
                                placeholder="https://hooks.example.com/notify"
                                value="${i.resource_webhook_url??""}">
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
                    ${Oe("backups")}
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
                    ${Oe("notifications")}
                </div>
                <form id="notifications-form" class="uk-form-stacked">
                    <div class="uk-grid-medium uk-child-width-1-2@m" uk-grid>
                        <div>
                            <h4 class="kp-view-title uk-margin-bottom">Email (SMTP)</h4>
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
                        </div>
                        <div>
                            <h4 class="kp-view-title uk-margin-bottom">SMS (AWS SNS)</h4>
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

        <!-- malware: scan history retention + scanner resource caps -->
        <li>
            <div class="kp-card uk-padding">
                <div class="uk-flex uk-flex-right uk-margin-bottom">
                    ${Oe("malware")}
                </div>
                <form id="malware-form" class="uk-form-stacked">
                    <p class="kp-muted uk-text-small uk-margin-bottom">
                        Every site's html directory is scanned nightly at midnight with ClamAV and Linux Malware Detect.
                        Scans run one site at a time in a throwaway container.
                    </p>
                    <div class="uk-grid-small uk-child-width-1-3@m" uk-grid>
                        <div>
                            <label class="kp-label" for="malware-retain-days">Retain History (days)</label>
                            <input class="uk-input kp-input" id="malware-retain-days" name="malware_retain_days" type="number"
                                min="1" max="3650" step="1" placeholder="30"
                                value="${o.malware_retain_days||"30"}">
                            <p class="kp-muted uk-text-small uk-margin-small-top">
                                Scan results older than this are pruned after each nightly run.
                            </p>
                        </div>
                        <div>
                            <label class="kp-label" for="malware-memory-mb">Scanner Memory (MB)</label>
                            <input class="uk-input kp-input" id="malware-memory-mb" name="malware_memory_mb" type="number"
                                min="512" max="65536" step="1" placeholder="2048"
                                value="${o.malware_memory_mb||"2048"}">
                            <p class="kp-muted uk-text-small uk-margin-small-top">
                                ClamAV's signature set alone needs over 1 GB; too low and scans fail out of memory.
                            </p>
                        </div>
                        <div>
                            <label class="kp-label" for="malware-cpus">Scanner CPUs</label>
                            <input class="uk-input kp-input" id="malware-cpus" name="malware_cpus" type="number"
                                min="0.1" max="64" step="0.1" placeholder="1"
                                value="${o.malware_cpus||"1"}">
                            <p class="kp-muted uk-text-small uk-margin-small-top">
                                CPU cores the scanner may use. Fractions are allowed (e.g. 0.5).
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
    </ul>
    `;let l=e.querySelector("#kp-settings-pills"),r=e.querySelector("#kp-settings-switcher"),c=u=>{UIkit.switcher(r).show(u),l.querySelectorAll(":scope > li").forEach((p,m)=>p.classList.toggle("kp-pill-active",m===u)),history.replaceState(null,"",u===0?"#settings":`#settings/${Cs[u]}`)};l.querySelectorAll(":scope > li > a").forEach(u=>{u.addEventListener("click",p=>{p.preventDefault(),c(parseInt(u.closest("li").dataset.pill,10))})}),c(Math.max(0,Cs.indexOf(t.tab))),s.admin_domain&&Ls(s.admin_domain),e.querySelectorAll(".kp-settings-import").forEach(u=>{u.addEventListener("change",async p=>{let m=p.target.files[0];if(!m)return;let b=p.target.dataset.group,h=new FormData;h.append("file",m);try{let g=await fetch(`/api/settings/import?group=${encodeURIComponent(b)}`,{method:"POST",headers:{"X-CSRF-Token":window.KP?.csrf??""},body:h}),v=g.status===204?null:await g.json().catch(()=>null);if(!g.ok)throw new Error(v?.error||`HTTP ${g.status}`);d.success("Settings imported"),await ft(e,{tab:b})}catch(g){d.error(g.message)}finally{p.target.value=""}})}),document.getElementById("settings-form").addEventListener("submit",async u=>{u.preventDefault();let p=u.target.querySelector('[type="submit"]'),m=p.innerHTML;p.disabled=!0,p.innerHTML='<div uk-spinner="ratio: 0.6"></div> Saving...';let b=new FormData(u.target),h={admin_domain:b.get("admin_domain").trim()},g={resource_ram_reserve_gb:b.get("resource_ram_reserve_gb").trim(),resource_poll_interval:b.get("resource_poll_interval").trim(),resource_throttle_pct:b.get("resource_throttle_pct").trim(),resource_webhook_url:b.get("resource_webhook_url").trim(),shutdown_job_timeout:b.get("shutdown_job_timeout").trim()};try{await k.put("/settings",h),await k.put("/settings/resources",g),d.success("Settings saved"),Ls(h.admin_domain)}catch(v){d.error(v.message)}finally{p.disabled=!1,p.innerHTML=m}}),document.getElementById("backup-form").addEventListener("submit",async u=>{u.preventDefault();let p=u.target.querySelector('[type="submit"]'),m=p.innerHTML;p.disabled=!0,p.innerHTML='<div uk-spinner="ratio: 0.6"></div> Saving...';let b=new FormData(u.target),h={backup_schedule:b.get("backup_schedule").trim(),backup_retain_days:b.get("backup_retain_days").trim(),s3_endpoint:b.get("s3_endpoint").trim(),s3_bucket:b.get("s3_bucket").trim(),s3_region:b.get("s3_region").trim(),s3_access_key:b.get("s3_access_key").trim()},g=b.get("s3_secret_key").trim();g&&(h.s3_secret_key=g);try{await k.put("/settings/backup",h),d.success("Backup settings saved")}catch(v){d.error(v.message)}finally{p.disabled=!1,p.innerHTML=m}}),document.getElementById("notifications-form").addEventListener("submit",async u=>{u.preventDefault();let p=u.target.querySelector('[type="submit"]'),m=p.innerHTML;p.disabled=!0,p.innerHTML='<div uk-spinner="ratio: 0.6"></div> Saving...';let b=new FormData(u.target),h={smtp_host:b.get("smtp_host").trim(),smtp_port:b.get("smtp_port").trim(),smtp_username:b.get("smtp_username").trim(),smtp_from:b.get("smtp_from").trim(),smtp_tls:b.get("smtp_tls")?"true":"false",aws_access_key:b.get("aws_access_key").trim(),aws_region:b.get("aws_region").trim(),aws_sns_sender_id:b.get("aws_sns_sender_id").trim()},g=b.get("smtp_password").trim();g&&(h.smtp_password=g);let v=b.get("aws_secret_key").trim();v&&(h.aws_secret_key=v);try{await k.put("/settings/notifications",h),d.success("Notification settings saved")}catch($){d.error($.message)}finally{p.disabled=!1,p.innerHTML=m}}),document.getElementById("malware-form").addEventListener("submit",async u=>{u.preventDefault();let p=u.target.querySelector('[type="submit"]'),m=p.innerHTML;p.disabled=!0,p.innerHTML='<div uk-spinner="ratio: 0.6"></div> Saving...';let b=new FormData(u.target),h={malware_retain_days:b.get("malware_retain_days").trim(),malware_memory_mb:b.get("malware_memory_mb").trim(),malware_cpus:b.get("malware_cpus").trim()};try{await k.put("/settings/malware",h),d.success("Malware settings saved")}catch(g){d.error(g.message)}finally{p.disabled=!1,p.innerHTML=m}})}async function Ps(e){let t=`
        <div id="kp-edit-site-modal" uk-modal>
            <div class="uk-modal-dialog kp-modal uk-modal-body uk-width-large">
                <button class="uk-modal-close-default" type="button" uk-close></button>
                <h3 class="kp-view-title">Edit Site \u2014 ${e.Name}</h3>
                <form id="edit-site-form" class="uk-form-stacked uk-margin-top">
                    <div class="uk-grid-small" uk-grid>
                        <div class="uk-width-1-2@s">
                            <label class="kp-label">Site Name</label>
                            <input class="uk-input kp-input" name="name" type="text" value="${e.Name}" readonly disabled>
                        </div>
                        <div class="uk-width-1-2@s">
                            <label class="kp-label">Site Type</label>
                            <select class="uk-select kp-select" name="site_type" id="es-site-type">
                                <option value="1" ${e.SiteType===1?"selected":""}>PHP</option>
                                <option value="3" ${e.SiteType===3?"selected":""}>Static HTML</option>
                                <option value="4" ${e.SiteType===4?"selected":""}>Node.js</option>
                                <option value="5" ${e.SiteType===5?"selected":""}>.NET</option>
                                <option value="7" ${e.SiteType===7?"selected":""}>Python</option>
                                <option value="6" ${e.SiteType===6?"selected":""}>Reverse Proxy</option>
                            </select>
                        </div>
                        <div class="uk-width-1-2@s" id="es-php-version-wrap">
                            <label class="kp-label">PHP Version</label>
                            <select class="uk-select kp-select" name="php_version">
                                <option value="3" ${e.PHPVersion===3?"selected":""}>PHP 8.2</option>
                                <option value="4" ${e.PHPVersion===4?"selected":""}>PHP 8.3</option>
                                <option value="5" ${e.PHPVersion===5?"selected":""}>PHP 8.4</option>
                                <option value="6" ${e.PHPVersion===6?"selected":""}>PHP 8.5</option>
                            </select>
                        </div>
                        <div class="uk-width-1-2@s uk-hidden" id="es-node-version-wrap">
                            <label class="kp-label">Node.js Version</label>
                            <select class="uk-select kp-select" name="node_version">
                                <option value="2" ${e.RuntimeVersion===2?"selected":""}>Node 22 (LTS)</option>
                                <option value="4" ${e.RuntimeVersion===4?"selected":""}>Node 24</option>
                                <option value="5" ${e.RuntimeVersion===5?"selected":""}>Node 25</option>
                                <option value="6" ${e.RuntimeVersion===6?"selected":""}>Node 26</option>                                
                            </select>
                        </div>
                        <div class="uk-width-1-2@s uk-hidden" id="es-dotnet-version-wrap">
                            <label class="kp-label">.NET Version</label>
                            <select class="uk-select kp-select" name="dotnet_version">
                                <option value="1" ${e.RuntimeVersion===1?"selected":""}>.NET 8.0 (LTS)</option>
                                <option value="2" ${e.RuntimeVersion===2?"selected":""}>.NET 9.0</option>
                                <option value="3" ${e.RuntimeVersion===3?"selected":""}>.NET 10.0 (LTS)</option>
                            </select>
                        </div>
                        <div class="uk-width-1-2@s uk-hidden" id="es-python-version-wrap">
                            <label class="kp-label">Python Version</label>
                            <select class="uk-select kp-select" name="python_version">
                                <option value="1" ${e.SiteType===7&&e.RuntimeVersion===1?"selected":""}>Python 3.11</option>
                                <option value="2" ${e.SiteType===7&&e.RuntimeVersion===2?"selected":""}>Python 3.12</option>
                                <option value="3" ${e.SiteType===7&&e.RuntimeVersion===3?"selected":""}>Python 3.13</option>
                                <option value="4" ${e.SiteType!==7||e.RuntimeVersion===4?"selected":""}>Python 3.14</option>
                            </select>
                        </div>
                        <div class="uk-width-1-1 uk-hidden" id="es-start-command-wrap">
                            <label class="kp-label">Start Command</label>
                            <input class="uk-input kp-input" name="start_command" type="text" value="${e.StartCommand||""}">
                        </div>
                        <div class="uk-width-1-1 ${e.SiteType!==1?"uk-hidden":""}" id="es-wordpress-wrap">
                            <label><input class="uk-checkbox" type="checkbox" name="install_wordpress" checked> WordPress</label>
                        </div>
                    </div>
                    <div class="uk-flex uk-flex-right uk-margin-top" style="gap:8px">
                        <button type="button" class="uk-button kp-btn-ghost uk-modal-close">Cancel</button>
                        <button type="submit" class="uk-button kp-btn-primary">Save Changes</button>
                    </div>
                </form>
            </div>
        </div>`;document.body.insertAdjacentHTML("beforeend",t);let s=UIkit.modal("#kp-edit-site-modal"),a=document.getElementById("es-site-type"),n=document.getElementById("es-php-version-wrap"),i=document.getElementById("es-node-version-wrap"),o=document.getElementById("es-dotnet-version-wrap"),l=document.getElementById("es-python-version-wrap"),r=document.getElementById("es-start-command-wrap"),c=document.getElementById("es-wordpress-wrap");s.show();let u=p=>{n.classList.toggle("uk-hidden",p!==1&&p!==2||p===6),i.classList.toggle("uk-hidden",p!==4),o.classList.toggle("uk-hidden",p!==5),l.classList.toggle("uk-hidden",p!==7),r.classList.toggle("uk-hidden",p!==4&&p!==5&&p!==7),r.querySelector("input").required=p===7,c.classList.toggle("uk-hidden",p!==1)};u(e.SiteType),a.addEventListener("change",()=>u(parseInt(a.value))),document.getElementById("edit-site-form").addEventListener("submit",async p=>{p.preventDefault();let m=p.target.querySelector('[type="submit"]'),b=m.innerHTML;m.disabled=!0,m.innerHTML='<div uk-spinner="ratio: 0.6"></div> Saving...';let h=new FormData(p.target),g=parseInt(h.get("site_type")),v=null;g===4&&(v=parseInt(h.get("node_version"))),g===5&&(v=parseInt(h.get("dotnet_version"))),g===7&&(v=parseInt(h.get("python_version")));let $={php_version:parseInt(h.get("php_version"))||3,site_type:g,runtime_version:v,start_command:h.get("start_command")?.trim()||""},y=g===1?h.get("install_wordpress")==="on":!1;try{if(await k.put(`/sites/${e.ID}`,$),s.hide(),document.getElementById("kp-edit-site-modal")?.remove(),g!==6){I("Applying Changes","Saving changes and recreating pod...");try{await k.post(`/sites/${e.ID}/recreate`,{install_wordpress:y,prune:!0}),T(),d.success("Site updated and pod recreated")}catch(L){T(),d.error("Site saved but pod recreate failed: "+L.message)}}else d.success("Site updated");x.go("site-detail",{id:String(e.ID)})}catch(L){d.error(L.message),m.disabled=!1,m.innerHTML=b}}),document.getElementById("kp-edit-site-modal").addEventListener("hidden",()=>document.getElementById("kp-edit-site-modal")?.remove())}function _s(e){return`
        <div id="backups-panel" data-site-id="${e}">

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

        </div>`}function si(e){if(!e||e.length===0)return'<p class="kp-muted uk-text-small uk-margin-remove">No snapshots yet.</p>';let t=a=>a===2?'<span class="kp-mono" style="color:var(--kp-cyan)">S3</span>':'<span class="kp-mono" style="color:var(--kp-blue)">Local</span>';return`
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
            <tbody>${e.map(a=>`
        <tr>
            <td class="kp-mono" style="font-size:0.8rem">${f(a.SnapshotID)}</td>
            <td>${a.Label?f(a.Label):"\u2014"}</td>
            <td>${t(a.BackupType)}</td>
            <td>${A(a.SizeBytes)}</td>
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
        </div>`}function Is(e,t,s){let a=Date.now()+18e5,n=setInterval(async()=>{try{let i=await k.get(`/sites/${s||t}/backups/restore-status`);(!i?.active||Date.now()>a)&&(clearInterval(n),T(),i?.active?d.error("Import timed out \u2014 check server logs"):i?.error?d.error(`Import failed: ${i.error}`):d.success("Import complete"),await pe(e,t))}catch{Date.now()>a&&(clearInterval(n),T(),d.error("Import status unavailable \u2014 check server logs"))}},3e3)}async function pe(e,t){try{let[s,a]=await Promise.all([k.get(`/sites/${t}/backup-repo`),k.get(`/sites/${t}/backups`)]),n=e.querySelector("#backup-local-enabled"),i=e.querySelector("#backup-s3-enabled");n&&(n.checked=!!s.LocalEnabled),i&&(i.checked=!!s.S3Enabled);let o=e.querySelector("#backup-error-banner");if(o)if(s.last_error){let r=s.last_error_at?` (${new Date(s.last_error_at).toLocaleString()})`:"";o.innerHTML=`
                    <div uk-alert class="uk-alert-warning">
                        <a class="uk-alert-close" uk-close></a>
                        <p><strong>Last scheduled backup failed${r}:</strong> ${f(s.last_error)}</p>
                    </div>`}else o.innerHTML="";let l=e.querySelector("#backup-list-wrap");l&&(l.innerHTML=si(a))}catch(s){let a=e.querySelector("#backup-list-wrap");a&&(a.innerHTML=`<p class="kp-muted uk-text-small">Failed to load backups: ${f(s.message)}</p>`)}}function Bs(e,t){e.querySelector("#backup-repo-save")?.addEventListener("click",async()=>{let a={local_enabled:e.querySelector("#backup-local-enabled")?.checked??!1,s3_enabled:e.querySelector("#backup-s3-enabled")?.checked??!1};try{await k.put(`/sites/${t}/backup-repo`,a),d.success("Backup destinations saved")}catch(n){d.error(n.message)}}),e.querySelector("#backup-run-btn")?.addEventListener("click",async()=>{try{await k.post(`/sites/${t}/backups`,{label:"manual"})}catch(i){d.error(i.message);return}I("Backup Running","Snapshotting files and database \u2014 this may take a few minutes.");let a=Date.now()+1800*1e3,n=setInterval(async()=>{try{let i=await k.get(`/sites/${t}/backups/backup-status`);(!i?.active||Date.now()>a)&&(clearInterval(n),T(),await pe(e,t),i?.active?d.error("Backup is taking longer than expected \u2014 check server logs for status"):i?.error?d.error(`Backup failed: ${i.error}`):d.success("Backup complete"))}catch{}},4e3)}),e.querySelector("#backup-list-wrap")?.addEventListener("click",async a=>{let n=a.target.closest(".backup-restore-btn");if(n){let l=n.dataset.id;if(!await P("Restore Site","This will restore the site from the selected snapshot. The site will show a maintenance page during the restore. Continue?"))return;try{await k.post(`/sites/${t}/backups/${l}/restore`)}catch(m){d.error(m.message);return}I("Restore Running","Restoring files and database \u2014 the site will return automatically when complete.");let c=Date.now(),u=Date.now()+900*1e3,p=setInterval(async()=>{try{let m=await k.get(`/sites/${t}/backups/restore-status`);(!m?.active||Date.now()>u)&&(clearInterval(p),T(),m?.active?d.error("Restore timed out"):d.success("Restore complete"),await pe(e,t))}catch{}},3e3);return}let i=a.target.closest(".backup-delete-btn");if(i){let l=i.dataset.id;if(!await P("Delete Snapshot","This will permanently remove the snapshot from all configured repositories. This cannot be undone."))return;I("Deleting Snapshot","Removing snapshot data from repositories \u2014 this may take a moment.");try{await k.delete(`/sites/${t}/backups/${l}`),T(),d.success("Snapshot deleted"),await pe(e,t)}catch(c){T(),d.error(c.message)}}let o=a.target.closest(".backup-download-btn");if(o){let l=o.dataset.id,r=`${Date.now().toString(36)}${Math.random().toString(36).slice(2,10)}`,c=`kp_dl_${r}`;I("Preparing Download","Your backup archive is being generated \u2014 this may take a moment depending on site size. Your download will begin automatically. Do not close this tab."),setTimeout(()=>{let u=document.createElement("a");u.href=`/api/sites/${t}/backups/${l}/download?dl=${r}`,u.style.display="none",document.body.appendChild(u),u.click(),document.body.removeChild(u);let p=Date.now(),m=setInterval(()=>{!document.cookie.split(";").some(h=>h.trim().startsWith(`${c}=`))&&Date.now()-p<18e5||(clearInterval(m),document.cookie=`${c}=; Path=/; Max-Age=0`,T())},500)},300);return}});let s=e.querySelector("#import-backup-modal");s&&(UIkit.util.on(s,"beforeshow",async()=>{let a=s.querySelector("#import-target-site");try{let i=await k.get("/sites"),o=Number(t);a.innerHTML=i.map(l=>`<option value="${l.ID}"${Number(l.ID)===o?" selected":""}>${l.Name}</option>`).join("")}catch{a.innerHTML='<option value="">Failed to load sites</option>'}let n=s.querySelector("#import-sftp-list");try{let i=await k.get(`/sites/${t}/backups/import/files`);!i||i.length===0?n.innerHTML='<p class="kp-muted uk-text-small">No files found.</p>':n.innerHTML=i.map(o=>`
                    <div class="uk-flex uk-flex-middle uk-flex-between uk-margin-small-bottom">
                        <span class="kp-mono uk-text-small">${f(o)}</span>
                        <button class="uk-button kp-btn-primary kp-btn-sm import-sftp-btn" data-file="${f(o)}">
                            Restore
                        </button>
                    </div>`).join("")}catch(i){n.innerHTML=`<p class="kp-muted uk-text-small">Failed to list files: ${f(i.message)}</p>`}}),s.querySelector("#import-upload-btn")?.addEventListener("click",async()=>{let a=s.querySelector("#import-file-input"),n=s.querySelector("#import-target-site")?.value;if(!a?.files?.length){d.error("Select an archive file first");return}let i=a.files[0],o=new FormData;o.append("archive",i),o.append("target_site_id",n),UIkit.modal(s).hide(),I("Importing Backup","Uploading and restoring \u2014 this may take several minutes.");try{await fetch(`/api/sites/${t}/backups/import/upload`,{method:"POST",headers:{"X-CSRF-Token":window.KP?.csrf??""},body:o,credentials:"same-origin"}).then(async l=>{if(!l.ok){let r=await l.json().catch(()=>({}));throw new Error(r.error||`HTTP ${l.status}`)}})}catch(l){T(),d.error(l.message);return}Is(e,t,n)}),s.querySelector("#import-sftp-list")?.addEventListener("click",async a=>{let n=a.target.closest(".import-sftp-btn");if(!n)return;let i=n.dataset.file,o=s.querySelector("#import-target-site")?.value;UIkit.modal(s).hide(),I("Importing from SFTP","Restoring archive \u2014 this may take several minutes.");try{await k.post(`/sites/${t}/backups/import/sftp`,{filename:i,target_site_id:parseInt(o,10)})}catch(l){T(),d.error(l.message);return}Is(e,t,o)}))}function gt(){return`
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
        </div>`}async function Se(e){let t=document.getElementById("basicauth-panel");if(t)try{let[s,a]=await Promise.all([k.get(`/sites/${e}/basicauth`),k.get(`/sites/${e}/basicauth/users`)]),n=t.querySelector("#ba-enabled"),i=t.querySelector("#ba-realm");n&&(n.checked=!!s.Enabled),i&&(i.value=s.Realm??"Restricted"),ai(t,a??[])}catch(s){d.error("Failed to load basic auth settings: "+s.message)}}function ai(e,t){let s=e.querySelector("#ba-users-list");if(s){if(!t.length){s.innerHTML='<p class="kp-muted uk-text-small">No credentials configured.</p>';return}s.innerHTML=t.map(a=>`
        <div class="uk-flex uk-flex-middle uk-margin-small-bottom ba-user-row" data-uid="${a.id}" style="gap:8px">
            <span class="kp-mono" style="flex:1">${f(a.username)}</span>
            <a href="javascript:void(0);" class="kp-muted ba-delete-btn" uk-icon="trash" uk-tooltip="Remove credential"></a>
        </div>`).join("")}}function vt(e,t){let s=new AbortController,a={signal:s.signal};e.addEventListener("click",async n=>{if(!n.target.closest("#ba-config-save"))return;let i=e.querySelector("#ba-config-save"),o=i.innerHTML;i.disabled=!0,i.innerHTML='<div uk-spinner="ratio: 0.5"></div>';try{await k.put(`/sites/${t}/basicauth`,{enabled:e.querySelector("#ba-enabled").checked,realm:e.querySelector("#ba-realm").value.trim()||"Restricted"}),d.success("Basic auth settings saved")}catch(l){d.error(l.message)}finally{i.disabled=!1,i.innerHTML=o}},a),e.addEventListener("click",async n=>{if(!n.target.closest("#ba-add-user"))return;let i=e.querySelector("#ba-new-username").value.trim(),o=e.querySelector("#ba-new-password").value;if(!i||!o){d.error("Username and password are required");return}let l=e.querySelector("#ba-add-user"),r=l.innerHTML;l.disabled=!0,l.innerHTML='<div uk-spinner="ratio: 0.5"></div>';try{await k.put(`/sites/${t}/basicauth/users`,{username:i,password:o}),d.success(`Credential saved for ${i}`),e.querySelector("#ba-new-username").value="",e.querySelector("#ba-new-password").value="",await Se(t)}catch(c){d.error(c.message)}finally{l.disabled=!1,l.innerHTML=r}},a),e.addEventListener("click",async n=>{let i=n.target.closest(".ba-delete-btn");if(!i)return;let o=i.closest(".ba-user-row")?.dataset.uid;if(o)try{await k.delete(`/sites/${t}/basicauth/users/${o}`),d.success("Credential removed"),await Se(t)}catch(l){d.error(l.message)}},a),e.__basicAuthAbort?.abort(),e.__basicAuthAbort=s}var $e={1:"Nginx",2:"PHP",3:"MariaDB",4:"Redis",5:"Varnish",6:"Proxy Cache"};function Ee(e,t,s){let a=s?Object.entries(s):[];return`
        <div>
            <div class="uk-flex uk-flex-between uk-flex-middle uk-margin-small-bottom">
                <div class="uk-flex uk-flex-middle" style="gap:10px">
                    <h4 class="kp-view-title uk-margin-remove">${$e[t]}</h4>
                </div>
                <div class="uk-flex" style="gap:8px">
                    <button class="uk-button kp-btn-ghost kp-btn-sm cfg-add-row" data-type="${t}" uk-tooltip="Add a Key">
                        <span uk-icon="plus"></span>
                    </button>
                    <button class="uk-button kp-btn-secondary kp-btn-sm cfg-save" data-type="${t}" data-site="${e}" uk-tooltip="Save the Configuration">
                        <span uk-icon="check"></span>
                    </button>
                    <button class="uk-button kp-btn-ghost kp-btn-sm cfg-reset" data-type="${t}" data-site="${e}" uk-tooltip="Reset to Defaults">
                        <span uk-icon="refresh"></span>
                    </button>
                    <a class="uk-button kp-btn-ghost kp-btn-sm" href="/api/sites/${e}/configs/${t}/export" download="${e}-config-${t}.csv" uk-tooltip="Export config as CSV">
                        <span uk-icon="download"></span>
                    </a>
                    <label class="uk-button kp-btn-ghost kp-btn-sm cfg-import-label" data-type="${t}" data-site="${e}" uk-tooltip="Import config from CSV" style="cursor:pointer">
                        <span uk-icon="upload"></span>
                        <input type="file" class="cfg-import-input" accept=".csv" style="display:none" data-type="${t}" data-site="${e}">
                    </label>
                </div>
            </div>
            <div class="kp-config-grid cfg-rows" data-type="${t}">
                ${a.map(([n,i])=>me(n,i)).join("")}
            </div>
        </div>`}function Ms(e,t){let s=t?.enabled==="true",a=t?Object.entries(t).filter(([n])=>n!=="enabled"):[];return`
        <div>
            <div class="uk-flex uk-flex-between uk-flex-middle uk-margin-small-bottom">
                <div class="uk-flex uk-flex-middle" style="gap:10px">
                    <h4 class="kp-view-title uk-margin-remove">Varnish</h4>
                </div>
                <div class="uk-flex" style="gap:8px">
                    <button class="uk-button kp-btn-ghost kp-btn-sm cfg-add-row" data-type="5" uk-tooltip="Add a Key">
                        <span uk-icon="plus"></span>
                    </button>
                    <button class="uk-button kp-btn-secondary kp-btn-sm cfg-save" data-type="5" data-site="${e}" uk-tooltip="Save the Configuration">
                        <span uk-icon="check"></span>
                    </button>
                    <button class="uk-button kp-btn-ghost kp-btn-sm cfg-reset" data-type="5" data-site="${e}" uk-tooltip="Reset to Defaults">
                        <span uk-icon="refresh"></span>
                    </button>
                    <a class="uk-button kp-btn-ghost kp-btn-sm" href="/api/sites/${e}/configs/5/export" download="${e}-config-5.csv" uk-tooltip="Export config as CSV">
                        <span uk-icon="download"></span>
                    </a>
                    <label class="uk-button kp-btn-ghost kp-btn-sm cfg-import-label" data-type="5" data-site="${e}" uk-tooltip="Import config from CSV" style="cursor:pointer">
                        <span uk-icon="upload"></span>
                        <input type="file" class="cfg-import-input" accept=".csv" style="display:none" data-type="5" data-site="${e}">
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
                ${a.map(([n,i])=>me(n,i)).join("")}
            </div>
        </div>`}function wt(e,t){let s=t?.enabled==="true",a=t?Object.entries(t).filter(([n])=>n!=="enabled"):[];return`
        <div>
            <div class="uk-flex uk-flex-between uk-flex-middle uk-margin-small-bottom">
                <div class="uk-flex uk-flex-middle" style="gap:10px">
                    <h4 class="kp-view-title uk-margin-remove">Proxy Cache</h4>
                </div>
                <div class="uk-flex" style="gap:8px">
                    <button class="uk-button kp-btn-ghost kp-btn-sm cfg-add-row" data-type="6" uk-tooltip="Add a Key">
                        <span uk-icon="plus"></span>
                    </button>
                    <button class="uk-button kp-btn-secondary kp-btn-sm cfg-save" data-type="6" data-site="${e}" uk-tooltip="Save the Configuration">
                        <span uk-icon="check"></span>
                    </button>
                    <button class="uk-button kp-btn-ghost kp-btn-sm cfg-reset" data-type="6" data-site="${e}" uk-tooltip="Reset to Defaults">
                        <span uk-icon="refresh"></span>
                    </button>
                    <a class="uk-button kp-btn-ghost kp-btn-sm" href="/api/sites/${e}/configs/6/export" download="${e}-config-6.csv" uk-tooltip="Export config as CSV">
                        <span uk-icon="download"></span>
                    </a>
                    <label class="uk-button kp-btn-ghost kp-btn-sm cfg-import-label" data-type="6" data-site="${e}" uk-tooltip="Import config from CSV" style="cursor:pointer">
                        <span uk-icon="upload"></span>
                        <input type="file" class="cfg-import-input" accept=".csv" style="display:none" data-type="6" data-site="${e}">
                    </label>
                </div>
            </div>

            <!-- enable/disable toggle \u2014 applies immediately, no pod recreate -->
            <div class="uk-margin-small-bottom" style="background:var(--kp-surface-2);padding:10px 12px;border-radius:6px">
                <label class="uk-flex uk-flex-middle" style="gap:10px;cursor:pointer">
                    <input type="checkbox" class="uk-checkbox proxycache-enabled-toggle" ${s?"checked":""}>
                    <span>Enable Proxy Cache</span>
                    <span class="kp-muted uk-text-small">\u2014 ttl_mode is fixed or upstream; memory is capped at 256M</span>
                </label>
            </div>

            <div class="kp-config-grid cfg-rows" data-type="6">
                ${a.map(([n,i])=>me(n,i)).join("")}
            </div>
        </div>`}var yt={5:".varnish-enabled-toggle",6:".proxycache-enabled-toggle"};function qs(e,t,s){e.querySelector(yt[t]).checked=s.enabled==="true",e.querySelectorAll(`.cfg-rows[data-type="${t}"] .cfg-key`).forEach(a=>{a.value==="enabled"&&a.closest(".kp-config-row").remove()})}function me(e="",t=""){return`<div class="kp-config-row">
        <div class="kp-config-key">
            <input class="cfg-key" type="text" value="${e}" placeholder="key">
        </div>
        <div class="kp-config-val">
            <input class="cfg-val" type="text" value="${t}" placeholder="value">
        </div>
        <button class="kp-config-del cfg-del-row" title="Remove">
            <span uk-icon="icon: close; ratio: 0.8"></span>
        </button>
    </div>`}function xt(e,t,s){e.addEventListener("click",a=>{if(a.target.closest(".cfg-add-row")){let n=a.target.closest(".cfg-add-row");e.querySelector(`.cfg-rows[data-type="${n.dataset.type}"]`).insertAdjacentHTML("beforeend",me())}},{signal:s}),e.addEventListener("click",a=>{a.target.closest(".cfg-del-row")&&a.target.closest(".kp-config-row").remove()},{signal:s}),e.addEventListener("click",async a=>{let n=a.target.closest(".cfg-save");if(!n)return;let{type:i,site:o}=n.dataset,l=e.querySelectorAll(`.cfg-rows[data-type="${i}"] .kp-config-row`),r={};if(l.forEach(c=>{let u=c.querySelector(".cfg-key").value.trim(),p=c.querySelector(".cfg-val").value.trim();u&&(r[u]=p)}),i==="5"){let c=e.querySelector(".varnish-enabled-toggle");r.enabled=c?.checked?"true":"false"}if(i==="6"){let c=e.querySelector(".proxycache-enabled-toggle");r.enabled=c?.checked?"true":"false"}try{await k.put(`/sites/${o}/configs/${i}`,r),d.success(`${$e[i]} config saved`)}catch(c){d.error(c.message)}},{signal:s}),e.addEventListener("click",async a=>{let n=a.target.closest(".cfg-reset");if(!n)return;let{type:i,site:o}=n.dataset;if(await P("Reset Config",`Reset ${$e[i]} config to defaults?`))try{let r=await k.post(`/sites/${o}/configs/${i}/reset`),c=e.querySelector(`.cfg-rows[data-type="${i}"]`);c.innerHTML=Object.entries(r).map(([u,p])=>me(u,p)).join(""),yt[i]&&qs(e,i,r),d.success(`${$e[i]} reset to defaults`)}catch(r){d.error(r.message)}},{signal:s}),e.addEventListener("change",async a=>{let n=a.target.closest(".cfg-import-input");if(!n)return;let{type:i,site:o}=n.dataset,l=n.files[0];if(!l)return;let r=new FormData;r.append("file",l);try{let c=await fetch(`/api/sites/${o}/configs/${i}/import`,{method:"POST",headers:{"X-CSRF-Token":window.KP?.csrf??""},body:r}),u=c.status===204?null:await c.json().catch(()=>null);if(!c.ok)throw new Error(u?.error||`HTTP ${c.status}`);let p=e.querySelector(`.cfg-rows[data-type="${i}"]`);p.innerHTML=Object.entries(u).map(([m,b])=>me(m,b)).join(""),yt[i]&&qs(e,i,u),d.success(`${$e[i]} config imported`)}catch(c){d.error(c.message)}finally{n.value=""}},{signal:s})}function Rs(e){return`
        <div id="crons-panel" data-site-id="${e}">
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

        </div>`}function Ds(e){if(!e||e.length===0)return'<p class="kp-muted uk-text-small uk-margin-remove">No cron jobs configured.</p>';let t=a=>a?new Date(a).toLocaleString():"\u2014";return`
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
            <tbody>${e.map(a=>`
        <tr>
            <td class="kp-text">${a.Label||'<span class="kp-muted">\u2014</span>'}</td>
            <td class="kp-mono kp-text-sm">${a.Schedule}</td>
            <td class="kp-muted uk-text-small">${t(a.LastRun)}</td>
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
        </div>`}async function Ve(e,t){let s=e.querySelector("#cron-list-wrap");if(s)try{let a=await k.get(`/sites/${t}/crons`);s.innerHTML=Ds(a)}catch(a){s.innerHTML=`<p class="kp-muted uk-text-small">Failed to load cron jobs: ${f(a.message)}</p>`}}function Hs(e,t){let s=[],a=e.querySelector("#cron-modal"),n=e.querySelector("#cron-modal-title"),i=e.querySelector("#cron-modal-id"),o=e.querySelector("#cron-modal-label"),l=e.querySelector("#cron-modal-command"),r=e.querySelector("#cron-modal-schedule"),c=e.querySelector("#cron-schedule-preview"),u=e.querySelector("#cron-modal-enabled");r?.addEventListener("input",()=>{c.textContent=As(r.value.trim())}),e.querySelector("#cron-add-btn")?.addEventListener("click",()=>{n.textContent="Add Cron Job",i.value="",o.value="",l.value="",r.value="",c.textContent="",u.checked=!0,UIkit.modal(a).show()}),e.querySelector("#cron-modal-save")?.addEventListener("click",async()=>{let p=l.value.trim(),m=r.value.trim();if(!p||!m){d.error("Command and schedule are required");return}let b={label:o.value.trim(),command:p,schedule:m,enabled:u.checked},h=i.value;try{h?(await k.put(`/sites/${t}/crons/${h}`,b),d.success("Cron job updated")):(await k.post(`/sites/${t}/crons`,b),d.success("Cron job created")),UIkit.modal(a).hide(),await Ve(e,t),s=await k.get(`/sites/${t}/crons`)}catch(g){d.error(g.message)}}),e.querySelector("#cron-list-wrap")?.addEventListener("click",async p=>{let m=p.target.closest(".cron-detail-btn");if(m){let v=m.dataset.id,$=s.find(L=>String(L.ID)===v);if(!$)return;document.body.insertAdjacentHTML("beforeend",`
                <div id="cron-detail-modal" uk-modal>
                    <div class="uk-modal-dialog kp-modal uk-modal-body uk-width-large">
                        <button class="uk-modal-close-default" type="button" uk-close></button>
                        <h3 class="kp-view-title uk-margin-bottom">Run Details \u2014 ${f($.Label||String($.ID))}</h3>
                        <div class="uk-margin-small-bottom">
                            <label class="kp-label">Output</label>
                            <pre class="kp-cron-output">${f($.LastOutput||"(no output)")}</pre>
                        </div>
                        <div class="uk-margin-small-top">
                            <label class="kp-label">Error</label>
                            <pre class="kp-cron-output kp-cron-output-error">${f($.LastError||"(no error)")}</pre>
                        </div>
                    </div>
                </div>`);let y=document.getElementById("cron-detail-modal");UIkit.modal(y).show(),y.addEventListener("hidden",()=>y.remove(),{once:!0});return}let b=p.target.closest(".cron-edit-btn");if(b){let v=b.dataset.id,$=s.find(y=>String(y.ID)===v);if(!$)return;n.textContent="Edit Cron Job",i.value=$.ID,o.value=$.Label||"",l.value=$.Command,r.value=$.Schedule,c.textContent=As($.Schedule),u.checked=$.Enabled,UIkit.modal(a).show();return}let h=p.target.closest(".cron-delete-btn");if(h){let v=h.dataset.id;if(!await P("Delete Cron Job","This will permanently remove the cron job. Continue?"))return;try{await k.delete(`/sites/${t}/crons/${v}`),d.success("Cron job deleted"),await Ve(e,t),s=await k.get(`/sites/${t}/crons`)}catch(y){d.error(y.message)}return}let g=p.target.closest(".cron-run-btn");if(g){let v=g.dataset.id;try{await k.post(`/sites/${t}/crons/${v}/run`)}catch(w){d.error(w.message);return}I("Running Cron Job","Executing the job inside the container \u2014 please wait.");let $=null;try{$=(await k.get(`/sites/${t}/crons`)).find(E=>String(E.ID)===v)?.LastRun??null}catch{}let y=Date.now()+300*1e3,L=setInterval(async()=>{try{let w=await k.get(`/sites/${t}/crons`),E=w.find(S=>String(S.ID)===v);if(!E||E.LastRun!==$||Date.now()>y){clearInterval(L),T(),s=w??[];let S=e.querySelector("#cron-list-wrap");S&&(S.innerHTML=Ds(w)),E?.LastError?d.error(`Job failed: ${E.LastError}`):d.success("Cron job complete")}}catch{}},2e3);return}}),e.querySelector("#cron-list-wrap")?.addEventListener("change",async p=>{let m=p.target.closest(".cron-toggle");if(!m)return;let b=m.dataset.id;try{await k.patch(`/sites/${t}/crons/${b}/toggle`,{enabled:m.checked}),d.success(m.checked?"Cron job enabled":"Cron job disabled")}catch(h){d.error(h.message),m.checked=!m.checked}}),k.get(`/sites/${t}/crons`).then(p=>{s=p??[]}).catch(()=>{})}function As(e){if(!e)return"";let t=e.trim().split(/\s+/);if(t.length!==5)return"invalid expression";let[s,a,n,i,o]=t;if(e==="* * * * *")return"every minute";if(s!=="*"&&a!=="*"&&n==="*"&&i==="*"&&o==="*")return`daily at ${a.padStart(2,"0")}:${s.padStart(2,"0")}`;if(s!=="*"&&a!=="*"&&n==="*"&&i==="*"&&o!=="*"){let l=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];return`weekly on ${o.split(",").map(c=>l[parseInt(c)]??c).join(", ")} at ${a.padStart(2,"0")}:${s.padStart(2,"0")}`}return s.startsWith("*/")?`every ${s.slice(2)} minutes`:a.startsWith("*/")?`every ${a.slice(2)} hours`:e}function Ws(e,t){return`
        <div id="dbtools-panel" data-site-id="${e}">

            <!-- tab pills -->
            <ul class="kp-tab-pills" id="kp-db-pills">
                <li data-tab="db-export"><a href="#"><span uk-icon="icon: download; ratio: 0.85"></span> Export</a></li>
                <li data-tab="db-import"><a href="#"><span uk-icon="icon: upload; ratio: 0.85"></span> Import</a></li>
                ${t===1?'<li data-tab="db-replace"><a href="#"><span uk-icon="icon: search; ratio: 0.85"></span> Search &amp; Replace</a></li>':""}
                <li data-tab="db-tables"><a href="#"><span uk-icon="icon: table; ratio: 0.85"></span> Optimize &amp; Repair</a></li>
            </ul>

            <!-- switcher panels -->
            <ul class="uk-switcher uk-margin-large-bottom" id="kp-db-switcher">

                <!-- export -->
                <li>
                    <div class="kp-card uk-padding-small">
                        <div class="uk-flex uk-flex-between uk-flex-middle uk-margin-small-bottom">
                            <h3 class="kp-view-title">Export</h3>
                            <button class="uk-button kp-btn-primary kp-btn-sm" id="dbtools-dump-btn" uk-tooltip="Download a Database Dump">
                                <span uk-icon="download"></span>
                            </button>
                        </div>
                        <p class="kp-muted uk-text-small uk-margin-small-top">
                            Downloads a gzip-compressed SQL dump of the site's database, including stored routines.
                        </p>
                    </div>
                </li>

                <!-- import -->
                <li>
                    <label class="uk-flex uk-flex-middle" style="gap:8px;cursor:pointer">
                        <input type="checkbox" class="uk-checkbox" id="dbtools-wipe">
                        <span class="kp-text">Wipe the database before importing</span>
                    </label>
                    <p class="kp-muted uk-text-small uk-margin-small-top uk-margin-small-bottom">
                        Without wipe, the dump is merged into the existing database \u2014 tables the dump recreates are
                        replaced, everything else is kept. The site is in maintenance mode while the import runs.
                    </p>

                    <div class="kp-card uk-padding-small uk-margin-bottom">
                        <div class="uk-flex uk-flex-between uk-flex-middle uk-margin-small-bottom">
                            <h3 class="kp-view-title">Upload Dump</h3>
                            <button class="uk-button kp-btn-primary kp-btn-sm" id="dbtools-upload-btn" uk-tooltip="Upload &amp; Import">
                                <span uk-icon="cloud-upload"></span>
                            </button>
                        </div>
                        <p class="kp-muted uk-text-small uk-margin-small-bottom">
                            Accepts <span class="kp-mono">.sql</span> or <span class="kp-mono">.sql.gz</span>. Maximum upload
                            size is <strong>512 MB</strong>. For larger dumps, transfer the file to
                            <span class="kp-mono">backups/import/</span> via SFTP and use <em>Import from SFTP</em> below.
                        </p>
                        <input type="file" class="uk-input kp-input" id="dbtools-file-input" accept=".sql,.gz">
                    </div>

                    <div class="kp-card uk-padding-small">
                        <div class="uk-flex uk-flex-between uk-flex-middle uk-margin-small-bottom">
                            <h3 class="kp-view-title">Import from SFTP</h3>
                            <button class="uk-button kp-btn-ghost kp-btn-sm" id="dbtools-sftp-refresh" uk-tooltip="Refresh the SFTP File List">
                                <span uk-icon="refresh"></span>
                            </button>
                        </div>
                        <p class="kp-muted uk-text-small uk-margin-small-bottom">
                            Dumps found in <span class="kp-mono">backups/import/</span> on this site's SFTP.
                        </p>
                        <div id="dbtools-sftp-list">
                            <div uk-spinner="ratio: 0.6" style="color:var(--kp-blue)"></div>
                        </div>
                    </div>
                </li>

                ${t===1?`
                <!-- search-replace (WordPress only) -->
                <li>
                    <div class="kp-card uk-padding-small">
                        <div class="uk-flex uk-flex-between uk-flex-middle uk-margin-small-bottom">
                            <h3 class="kp-view-title">Search &amp; Replace</h3>
                            <div class="uk-flex" style="gap:6px">
                                <button class="uk-button kp-btn-secondary kp-btn-sm" id="dbtools-sr-preview" uk-tooltip="Count Matches Without Changing Anything">
                                    <span uk-icon="search"></span>
                                </button>
                                <button class="uk-button kp-btn-primary kp-btn-sm" id="dbtools-sr-run" uk-tooltip="Run the Search &amp; Replace">
                                    <span uk-icon="play"></span>
                                </button>
                            </div>
                        </div>
                        <div class="uk-grid-small uk-child-width-1-2@s" uk-grid>
                            <div>
                                <label class="uk-form-label kp-text" for="dbtools-sr-search">Search</label>
                                <input class="uk-input kp-input" id="dbtools-sr-search" type="text" maxlength="1024" autocomplete="off">
                            </div>
                            <div>
                                <label class="uk-form-label kp-text" for="dbtools-sr-replace">Replace</label>
                                <input class="uk-input kp-input" id="dbtools-sr-replace" type="text" maxlength="1024" autocomplete="off">
                            </div>
                        </div>
                        <p class="kp-muted uk-text-small uk-margin-small-top">
                            Runs WP-CLI's serialization-safe search-replace across every table in the site's database.
                            Preview first to see how many replacements would be made.
                        </p>
                        <div id="dbtools-sr-result"></div>
                    </div>
                </li>`:""}

                <!-- optimize / repair -->
                <li>
                    <div class="kp-card uk-padding-small">
                        <div class="uk-flex uk-flex-between uk-flex-middle uk-margin-small-bottom">
                            <h3 class="kp-view-title">Optimize &amp; Repair</h3>
                            <div class="uk-flex" style="gap:6px">
                                <button class="uk-button kp-btn-ghost kp-btn-sm" id="dbtools-tables-refresh" uk-tooltip="Refresh the Table List">
                                    <span uk-icon="refresh"></span>
                                </button>
                                <button class="uk-button kp-btn-primary kp-btn-sm dbtools-maintain-btn" data-action="optimize" uk-tooltip="Optimize the Selected Tables" disabled>
                                    <span uk-icon="bolt"></span>
                                </button>
                                <button class="uk-button kp-btn-secondary kp-btn-sm dbtools-maintain-btn" data-action="repair" uk-tooltip="Repair the Selected Tables" disabled>
                                    <span uk-icon="cog"></span>
                                </button>
                            </div>
                        </div>
                        <div id="dbtools-tables-wrap">
                            <div uk-spinner="ratio: 0.8" style="color:var(--kp-blue)"></div>
                        </div>
                        <div id="dbtools-maintain-result"></div>
                    </div>
                </li>
            </ul>
        </div>`}function js(e,t){let s=e.querySelector("#dbtools-panel"),a=e.querySelector("#kp-db-pills"),n=e.querySelector("#kp-db-switcher");if(!s||!a||!n)return;let i=s.dataset.siteId,o=[...a.querySelectorAll(":scope > li")],l=(r,c)=>{UIkit.switcher(n).show(r),o.forEach((u,p)=>u.classList.toggle("kp-pill-active",p===r)),c&&history.replaceState(null,"",`#site-detail/${i}/${o[r].dataset.tab}`)};o.forEach((r,c)=>{r.querySelector(":scope > a").addEventListener("click",u=>{u.preventDefault(),l(c,!0)})}),l(Math.max(0,o.findIndex(r=>r.dataset.tab===t)),!1)}function zs(e,t){e.querySelector("#dbtools-dump-btn")?.addEventListener("click",()=>{let s=`${Date.now().toString(36)}${Math.random().toString(36).slice(2,10)}`,a=`kp_dl_${s}`;I("Preparing Download","Your database dump is being generated \u2014 your download will begin automatically. Do not close this tab."),setTimeout(()=>{let n=document.createElement("a");n.href=`/api/sites/${t}/db/dump?dl=${s}`,n.style.display="none",document.body.appendChild(n),n.click(),document.body.removeChild(n);let i=Date.now(),o=setInterval(()=>{!document.cookie.split(";").some(r=>r.trim().startsWith(`${a}=`))&&Date.now()-i<18e5||(clearInterval(o),document.cookie=`${a}=; Path=/; Max-Age=0`,T())},500)},300)}),e.querySelector("#dbtools-upload-btn")?.addEventListener("click",async()=>{let s=e.querySelector("#dbtools-file-input");if(!s?.files?.length){d.error("Select a .sql or .sql.gz file first");return}let a=await Ns(e);if(a===null)return;let n=new FormData;n.append("dump",s.files[0]),n.append("wipe",a?"1":"0"),I("Importing Database","Uploading and importing \u2014 the site is in maintenance mode until this completes.");try{await fetch(`/api/sites/${t}/db/import/upload`,{method:"POST",headers:{"X-CSRF-Token":window.KP?.csrf??""},body:n,credentials:"same-origin"}).then(async i=>{if(!i.ok){let o=await i.json().catch(()=>({}));throw new Error(o.error||`HTTP ${i.status}`)}})}catch(i){T(),d.error(i.message);return}s.value="",Us(e,t)}),e.querySelector("#dbtools-sftp-list")?.addEventListener("click",async s=>{let a=s.target.closest(".dbtools-sftp-btn");if(!a)return;let n=await Ns(e);if(n!==null){I("Importing Database","Importing from SFTP \u2014 the site is in maintenance mode until this completes.");try{await k.post(`/sites/${t}/db/import/sftp`,{filename:a.dataset.file,wipe:n})}catch(i){T(),d.error(i.message);return}Us(e,t)}}),e.querySelector("#dbtools-sr-preview")?.addEventListener("click",()=>Fs(e,t,!0)),e.querySelector("#dbtools-sr-run")?.addEventListener("click",()=>Fs(e,t,!1)),e.querySelector("#dbtools-tables-wrap")?.addEventListener("change",s=>{s.target.id==="dbtools-tables-all"&&e.querySelectorAll(".dbtools-table-check").forEach(a=>{a.checked=s.target.checked}),Et(e)}),e.querySelectorAll(".dbtools-maintain-btn").forEach(s=>{s.addEventListener("click",()=>ni(e,t,s.dataset.action))}),e.querySelector("#dbtools-tables-refresh")?.addEventListener("click",()=>$t(e,t)),$t(e,t),e.querySelector("#dbtools-sftp-refresh")?.addEventListener("click",()=>St(e,t)),St(e,t)}async function Ns(e){let t=!!e.querySelector("#dbtools-wipe")?.checked;return await P(t?"Wipe & Import Database":"Import Database",t?"Every table, view and routine in this site's database will be dropped before the import. This cannot be undone.":"The dump will be merged into this site's database, replacing any tables it recreates. This cannot be undone.")?t:null}async function St(e,t){let s=e.querySelector("#dbtools-sftp-list");if(s)try{let a=await k.get(`/sites/${t}/db/import/files`);if(!a||a.length===0){s.innerHTML='<p class="kp-muted uk-text-small uk-margin-remove">No files found.</p>';return}s.innerHTML=a.map(n=>`
            <div class="uk-flex uk-flex-middle uk-flex-between uk-margin-small-bottom">
                <span class="kp-mono uk-text-small">${f(n)}</span>
                <button class="uk-button kp-btn-primary kp-btn-sm dbtools-sftp-btn" data-file="${f(n)}">
                    Import
                </button>
            </div>`).join("")}catch(a){s.innerHTML=`<p class="kp-muted uk-text-small">Failed to list files: ${f(a.message)}</p>`}}function Us(e,t){let s=Date.now()+18e5,a=setInterval(async()=>{try{let n=await k.get(`/sites/${t}/db/import/status`);(!n?.active||Date.now()>s)&&(clearInterval(a),T(),n?.active?d.error("Import timed out \u2014 check server logs"):n?.error?d.error(`Import failed: ${n.error}`):d.success("Import complete"),await St(e,t))}catch{Date.now()>s&&(clearInterval(a),T(),d.error("Import status unavailable \u2014 check server logs"))}},3e3)}async function Fs(e,t,s){let a=e.querySelector("#dbtools-sr-search")?.value??"",n=e.querySelector("#dbtools-sr-replace")?.value??"",i=e.querySelector("#dbtools-sr-result");if(!a){d.error("Enter a search term first");return}if(!(!s&&!await P("Run Search & Replace",`Every occurrence of "${a}" in this site's database will be replaced with "${n}". This cannot be undone \u2014 download a dump first if unsure.`))){I(s?"Previewing Search & Replace":"Running Search & Replace","Scanning every table in the site's database \u2014 this may take a while on large sites.");try{let o=await k.post(`/sites/${t}/db/search-replace`,{search:a,replace:n,dry_run:s},18e5);T();let l=o?.count??0,r=s?`${l} replacement${l===1?"":"s"} would be made`:`${l} replacement${l===1?"":"s"} made`;i&&(i.innerHTML=`<p class="kp-text uk-text-small uk-margin-small-top uk-margin-remove-bottom">${f(r)}</p>`),s||d.success(r)}catch(o){T(),d.error(o.message)}}}async function $t(e,t){let s=e.querySelector("#dbtools-tables-wrap");if(s){try{let a=await k.get(`/sites/${t}/db/tables`);if(!a||a.length===0){s.innerHTML='<p class="kp-muted uk-text-small uk-margin-remove">No tables found.</p>',Et(e);return}let n=a.map(i=>`
            <tr>
                <td><input class="uk-checkbox dbtools-table-check" type="checkbox" value="${f(i.name)}"></td>
                <td class="kp-mono" style="font-size:0.8rem">${f(i.name)}</td>
                <td>${f(i.engine||"\u2014")}</td>
                <td class="uk-visible@s">${Number(i.rows).toLocaleString()}</td>
                <td>${A(i.size)}</td>
            </tr>`).join("");s.innerHTML=`
            <div class="uk-overflow-auto">
            <table class="uk-table uk-table-small uk-table-divider uk-margin-remove">
                <thead>
                    <tr>
                        <th class="uk-table-shrink">
                            <input class="uk-checkbox" type="checkbox" id="dbtools-tables-all" uk-tooltip="Select All">
                        </th>
                        <th>Table</th>
                        <th>Engine</th>
                        <th class="uk-visible@s">Rows</th>
                        <th>Size</th>
                    </tr>
                </thead>
                <tbody>${n}</tbody>
            </table>
            </div>`}catch(a){s.innerHTML=`<p class="kp-muted uk-text-small">Failed to list tables: ${f(a.message)}</p>`}Et(e)}}function Et(e){let t=[...e.querySelectorAll(".dbtools-table-check")],s=t.filter(n=>n.checked).length,a=e.querySelector("#dbtools-tables-all");a&&(a.checked=s>0&&s===t.length,a.indeterminate=s>0&&s<t.length),e.querySelectorAll(".dbtools-maintain-btn").forEach(n=>{n.disabled=s===0})}async function ni(e,t,s){let a=[...e.querySelectorAll(".dbtools-table-check:checked")].map(l=>l.value);if(a.length===0)return;let n=s==="repair"?"Repair":"Optimize";if(!await P(`${n} Tables`,`${n} ${a.length} table${a.length===1?"":"s"}? Tables may be briefly locked while this runs.`))return;I(`${n} Running`,`Running ${s} on ${a.length} table${a.length===1?"":"s"} \u2014 this may take a while on large tables.`);let o=e.querySelector("#dbtools-maintain-result");try{let l=await k.post(`/sites/${t}/db/tables/maintain`,{action:s,tables:a},18e5);T(),o&&(o.innerHTML=`<pre class="kp-cron-output uk-margin-small-top">${f(l?.output||"(no output)")}</pre>`),d.success(`${n} complete`)}catch(l){T(),d.error(l.message)}await $t(e,t)}var j="";function Xs(e){return`
        <div class="kp-card uk-padding uk-margin-top" id="fm-root" data-site="${e}">
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
        </div>`}function ii(){let e=j?j.split("/"):[],t="",s=['<a href="#" data-path="">html</a>'];for(let a of e)t=t?t+"/"+a:a,s.push(`<span class="kp-fm-sep">/</span><a href="#" data-path="${f(t)}">${f(a)}</a>`);return s.join("")}function oi(e){let t=new Date(e);return isNaN(t)?"":t.toLocaleString(void 0,{year:"numeric",month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})}function Os(e){return e==="d"?"folder":e==="l"?"link":"file-text"}function ke(e,t){return e?e+"/"+t:t}var Vs=new Set(["php","js","jsx","ts","tsx","css","scss","sass","less","html","htm","xml","json","txt","md","markdown","yml","yaml","ini","conf","cnf","toml","env","sh","bash","sql","log","csv","tsv","svg","htaccess","gitignore","lock","map"]);function li(e,t){if(t)return!1;let s=e.lastIndexOf(".");return e.startsWith(".")&&s===0?Vs.has(e.slice(1).toLowerCase()):s>=0&&Vs.has(e.slice(s+1).toLowerCase())}function ri(e){if(!e||!e.length)return le("folder","This folder is empty");let t=document.getElementById("fm-root").dataset.site;return`
        <table class="uk-table uk-table-divider uk-table-small uk-table-middle kp-fm-table">
            <thead>
                <tr>
                    <th>Name</th><th>Size</th><th>Perms</th><th>Modified</th><th></th>
                </tr>
            </thead>
            <tbody>${e.map(a=>{let n=ke(j,a.name),i=a.is_dir,o=li(a.name,i),l=i?`<a href="#" class="fm-nav" data-path="${f(n)}"><span uk-icon="icon: ${Os(a.type)}; ratio: 0.9"></span> ${f(a.name)}</a>`:`<span><span uk-icon="icon: ${Os(a.type)}; ratio: 0.9"></span> ${f(a.name)}</span>`;return`
            <tr data-path="${f(n)}" data-name="${f(a.name)}" data-dir="${i?1:0}" data-mode="${f(a.mode)}">
                <td class="kp-fm-name">${l}</td>
                <td class="uk-text-nowrap">${A(a.size,i)}</td>
                <td><code class="kp-mono">${f(a.mode)}</code></td>
                <td class="uk-text-nowrap uk-text-small kp-muted">${oi(a.mod_time)}</td>
                <td class="uk-text-right uk-text-nowrap">
                    ${o?`<button class="kp-fm-act fm-edit" data-path="${f(n)}" uk-tooltip="Edit"><span uk-icon="icon: pencil; ratio: 0.85"></span></button>`:""}
                    ${i?"":`<a class="kp-fm-act fm-download" href="/api/sites/${t}/files/download?path=${encodeURIComponent(n)}" uk-tooltip="Download"><span uk-icon="icon: download; ratio: 0.85"></span></a>`}
                    <button class="kp-fm-act fm-chmod" uk-tooltip="Permissions"><span uk-icon="icon: settings; ratio: 0.85"></span></button>
                    <button class="kp-fm-act fm-rename" uk-tooltip="Rename / Move"><span uk-icon="icon: move; ratio: 0.85"></span></button>
                    <button class="kp-fm-act fm-copy" uk-tooltip="Copy"><span uk-icon="icon: copy; ratio: 0.85"></span></button>
                    <button class="kp-fm-act fm-delete" uk-tooltip="Delete"><span uk-icon="icon: trash; ratio: 0.85"></span></button>
                </td>
            </tr>`}).join("")}</tbody>
        </table>`}async function F(e){let t=document.getElementById("fm-list"),s=document.getElementById("fm-breadcrumb");if(t){t.innerHTML=Ae(),s&&(s.innerHTML=ii());try{let a=await k.get(`/sites/${e}/files?path=${encodeURIComponent(j)}`);t.innerHTML=ri(a)}catch(a){t.innerHTML=R("Failed to list files: "+a.message)}}}function Ks(e,t){j=t||"",F(e)}function Te(e,t,s=""){return new Promise(a=>{let n="fm-prompt-modal";document.getElementById(n)?.remove();let i=document.createElement("div");i.id=n,i.setAttribute("uk-modal",""),i.innerHTML=`
            <div class="uk-modal-dialog uk-modal-body kp-modal">
                <h3 class="uk-modal-title">${f(e)}</h3>
                <label class="kp-label uk-margin-small-bottom">${f(t)}</label>
                <input class="uk-input kp-input" id="fm-prompt-input" value="${f(s)}" autocomplete="off">
                <div class="uk-flex uk-flex-right uk-margin-top" style="gap:8px">
                    <button class="uk-button kp-btn-ghost uk-modal-close">Cancel</button>
                    <button class="uk-button kp-btn-primary" id="fm-prompt-ok">OK</button>
                </div>
            </div>`,document.body.appendChild(i),window.UIkit&&UIkit.icon(i);let o=UIkit.modal(i),l=i.querySelector("#fm-prompt-input"),r=!1,c=u=>{r||(r=!0,a(u),o.hide())};i.querySelector("#fm-prompt-ok").addEventListener("click",()=>c(l.value.trim()||null)),l.addEventListener("keydown",u=>{u.key==="Enter"&&(u.preventDefault(),c(l.value.trim()||null))}),UIkit.util.on(i,"hidden",()=>{r||(r=!0,a(null)),i.remove()}),o.show(),setTimeout(()=>l.focus(),50)})}async function ci(e,t){let s=ke(j,t.name),a=await fetch(`/api/sites/${e}/files/upload?path=${encodeURIComponent(s)}`,{method:"POST",headers:{"X-CSRF-Token":window.KP?.csrf??""},body:t}),n=a.status===204?null:await a.json().catch(()=>null);if(!a.ok)throw new Error(n?.error||`HTTP ${a.status}`)}function Gs(e,t){j="",e.addEventListener("click",s=>{let a=s.target.closest("#fm-breadcrumb a");if(a){s.preventDefault(),Ks(t,a.dataset.path);return}let n=s.target.closest(".fm-nav");if(n){s.preventDefault(),Ks(t,n.dataset.path);return}let i=s.target.closest(".fm-edit");if(i){s.preventDefault(),pi(t,i.dataset.path,i.dataset.path.split("/").pop());return}}),e.querySelector("#fm-new-file")?.addEventListener("click",async()=>{let s=await Te("New File","File name");if(s)try{await k.post(`/sites/${t}/files/file`,{path:ke(j,s)}),F(t)}catch(a){d.error(a.message)}}),e.querySelector("#fm-new-dir")?.addEventListener("click",async()=>{let s=await Te("New Folder","Folder name");if(s)try{await k.post(`/sites/${t}/files/dir`,{path:ke(j,s)}),F(t)}catch(a){d.error(a.message)}}),e.querySelector("#fm-upload")?.addEventListener("change",async s=>{let a=[...s.target.files];if(a.length)try{for(let n of a)await ci(t,n);d.success(a.length===1?"File uploaded":`${a.length} files uploaded`),F(t)}catch(n){d.error(n.message)}finally{s.target.value=""}}),e.querySelector("#fm-refresh")?.addEventListener("click",()=>F(t)),e.addEventListener("click",async s=>{let a=s.target.closest("tr[data-path]");if(!a)return;let n=a.dataset.path,i=a.dataset.name;if(s.target.closest(".fm-chmod")){let o=await Te("Permissions",`Octal mode for "${i}"`,a.dataset.mode);if(!o)return;try{await k.patch(`/sites/${t}/files/chmod`,{path:n,mode:o}),F(t)}catch(l){d.error(l.message)}return}if(s.target.closest(".fm-rename")){let o=await Te("Rename / Move","New path (relative to current folder)",i);if(!o||o===i)return;try{await k.post(`/sites/${t}/files/move`,{src:n,dst:ke(j,o)}),F(t)}catch(l){d.error(l.message)}return}if(s.target.closest(".fm-copy")){let o=await Te("Copy","Destination name",i+"-copy");if(!o)return;try{await k.post(`/sites/${t}/files/copy`,{src:n,dst:ke(j,o)}),F(t)}catch(l){d.error(l.message)}return}if(s.target.closest(".fm-delete")){if(!await P("Delete",`Delete "${i}"? This cannot be undone.`))return;try{await k.delete(`/sites/${t}/files?path=${encodeURIComponent(n)}`),F(t)}catch(l){d.error(l.message)}return}})}var Ke=null;function Js(e){if(document.querySelector(`link[href="${e}"]`))return;let t=document.createElement("link");t.rel="stylesheet",t.href=e,document.head.appendChild(t)}function Tt(e){return new Promise((t,s)=>{let a=document.querySelector(`script[src="${e}"]`);if(a){if(a.dataset.loaded)return t();a.addEventListener("load",()=>t()),a.addEventListener("error",()=>s(new Error("failed to load "+e)));return}let n=document.createElement("script");n.src=e,n.addEventListener("load",()=>{n.dataset.loaded="1",t()}),n.addEventListener("error",()=>s(new Error("failed to load "+e))),document.head.appendChild(n)})}function di(){if(Ke)return Ke;let e="/static/vendor/codemirror";return Js(`${e}/lib/codemirror.css`),Js(`${e}/theme/material-darker.css`),Ke=Tt(`${e}/lib/codemirror.js`).then(()=>Promise.all([Tt(`${e}/mode/meta.js`),Tt(`${e}/addon/mode/loadmode.js`)])).then(()=>{window.CodeMirror.modeURL=`${e}/mode/%N/%N.js`}),Ke}function ui(e){let t=window.CodeMirror.findModeByFileName(e);return t?t.mode:null}async function pi(e,t,s){let a;try{a=await k.get(`/sites/${e}/files/content?path=${encodeURIComponent(t)}`)}catch(m){let b=/too large/i.test(m.message)?"File is too large to edit \u2014 download it instead.":/binary/i.test(m.message)?"Binary file \u2014 download it instead of editing.":m.message;d.error(b);return}try{await di()}catch(m){d.error("Editor failed to load: "+m.message);return}let n="fm-editor-modal";document.getElementById(n)?.remove();let i=document.createElement("div");i.id=n,i.setAttribute("uk-modal",""),i.innerHTML=`
        <div class="uk-modal-dialog kp-modal kp-fm-editor-dialog">
            <div class="uk-flex uk-flex-middle uk-flex-between uk-padding-small">
                <h3 class="uk-modal-title uk-margin-remove"><span uk-icon="file-text"></span> ${f(s)} <span id="fm-ed-dirty" class="kp-muted uk-text-small" hidden>\u2022 unsaved</span></h3>
                <div class="uk-flex" style="gap:8px">
                    <button class="uk-button kp-btn-primary kp-btn-sm" id="fm-ed-save"><span uk-icon="icon: check; ratio: 0.85"></span> Save</button>
                    <button class="uk-button kp-btn-ghost kp-btn-sm uk-modal-close"><span uk-icon="icon: close; ratio: 0.85"></span></button>
                </div>
            </div>
            <div class="kp-fm-editor-body">
                <textarea id="fm-ed-area"></textarea>
            </div>
        </div>`,document.body.appendChild(i),window.UIkit&&UIkit.icon(i);let o=UIkit.modal(i,{bgClose:!1,escClose:!0}),l=i.querySelector("#fm-ed-dirty"),r=null,c=!0,u=m=>{c=!m,l.hidden=!m};UIkit.util.on(i,"shown",()=>{if(r)return;r=window.CodeMirror.fromTextArea(i.querySelector("#fm-ed-area"),{value:a.content,lineNumbers:!0,theme:"material-darker",indentUnit:4,lineWrapping:!1,extraKeys:{"Ctrl-S":p,"Cmd-S":p,"Ctrl-F":"findPersistent","Ctrl-/":"toggleComment"}}),r.setValue(a.content),r.on("change",()=>u(!0));let m=ui(s);m&&(r.setOption("mode",m),window.CodeMirror.autoLoadMode(r,m)),setTimeout(()=>r.refresh(),30)}),UIkit.util.on(i,"hidden",()=>i.remove());async function p(){if(!r)return;let m=i.querySelector("#fm-ed-save"),b=m.innerHTML;m.disabled=!0,m.innerHTML='<div uk-spinner="ratio: 0.6"></div>';try{await k.put(`/sites/${e}/files/content`,{path:t,content:r.getValue()}),u(!1),d.success("Saved"),F(e)}catch(h){d.error(h.message)}finally{m.disabled=!1,m.innerHTML=b}}i.querySelector("#fm-ed-save").addEventListener("click",p),UIkit.util.on(i,"beforehide",m=>{!c&&!window.confirm("Discard unsaved changes?")&&m.preventDefault()}),o.show()}var mi=2e3;function Lt(e,t){return`
        <div>
            <div class="kp-log-controls">
                <select class="uk-select kp-select" id="log-container" style="width:140px;height:38px">
                    ${t===6?'<option value="access">Access Log</option><option value="waf">WAF Log</option>':`<option value="access">Access</option>
            <option value="nginx">Nginx</option>
                    ${(()=>{switch(t){case 1:case 2:return'<option value="php">PHP-FPM</option>';case 4:return'<option value="app">Node.js</option>';case 5:return'<option value="app">.NET</option>';case 7:return'<option value="app">Python</option>';default:return""}})()}
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
        </div>`}function Ys(e,t){let s=null,a=!1,n=e.querySelector("#log-output"),i=e.querySelector("#log-connect"),o=e.querySelector("#log-disconnect"),l=e.querySelector("#log-clear"),r=e.querySelector("#log-autoscroll"),c=e.querySelector("#log-status");function u(b){for(b.split(`
`).forEach(h=>{if(!h)return;let g=document.createElement("div");g.className=h.match(/WAF BLOCK/i)?"kp-log-line-err":h.match(/WAF DETECT/i)?"kp-log-line-warn":h.match(/error|crit|emerg/i)?"kp-log-line-err":h.match(/warn/i)?"kp-log-line-warn":h.match(/info|notice/i)?"kp-log-line-info":"",g.textContent=h,n.appendChild(g)});n.childElementCount>mi;)n.removeChild(n.firstChild);r.checked&&(n.scrollTop=n.scrollHeight)}function p(){s&&(s.close(),s=null),a=!1,i.disabled=!1,o.disabled=!0,c&&(c.textContent="Disconnected")}i.addEventListener("click",()=>{p();let b=e.querySelector("#log-container").value,h=e.querySelector("#log-tail").value,g=location.protocol==="https:"?"wss":"ws",v=b==="waf"?`${g}://${location.host}/api/sites/${t}/logs/waf?tail=${h}`:b==="proxy"?`${g}://${location.host}/api/sites/${t}/logs/proxy?tail=${h}`:b==="access"?`${g}://${location.host}/api/sites/${t}/logs/proxy?tail=${h}`:`${g}://${location.host}/api/sites/${t}/logs?container=${b}&tail=${h}`;s=new WebSocket(v),s.onopen=()=>{a=!0,i.disabled=!0,o.disabled=!1,c&&(c.textContent=`Connected \u2014 ${b}`)},s.onmessage=$=>u($.data),s.onerror=()=>{},s.onclose=()=>{a=!1,i.disabled=!1,o.disabled=!0,c&&(c.textContent="Disconnected")}}),o.addEventListener("click",p),l.addEventListener("click",()=>{n.innerHTML=""}),e.querySelector("#log-container").addEventListener("change",()=>{s&&s.readyState===WebSocket.OPEN&&(p(),i.click())});let m=x.go.bind(x);x.go=function(b,h={}){return s&&p(),m(b,h)}}var ki=50;function Qs(e){let t=[e.fname,e.lname].filter(Boolean).join(" ");return t?`${e.uname} (${t})`:e.uname}function Ct(){return`
        <div class="kp-card uk-padding uk-margin-top" id="managers-panel">
            <h3 class="kp-view-title uk-margin-bottom">Managers</h3>
            <p class="kp-muted uk-text-small uk-margin-small-bottom">
                Assigned managers have the same rights as the site owner on this site.
            </p>
            <p class="uk-text-small uk-margin-small-bottom">
                <span class="kp-label">Owner</span>&nbsp;<span id="mgr-owner">-</span>
            </p>
            <label class="kp-label" for="mgr-select">Assigned Managers</label>
            <select multiple class="uk-select kp-select" id="mgr-select" size="8"></select>
            <p class="kp-muted uk-text-small uk-margin-small-top">Hold Ctrl or Cmd to select more than one.</p>
            <div class="uk-flex uk-flex-right uk-margin-top">
                <button class="uk-button kp-btn-primary kp-btn-sm" id="mgr-save">
                    <span uk-icon="check"></span> Save Managers
                </button>
            </div>
        </div>`}async function Pt(e,t){let s=e.querySelector("#managers-panel");if(s)try{let[a,n]=await Promise.all([k.get(`/sites/${t}/managers`),k.get("/users")]),i=Array.isArray(n)?n:[],o=i.find(r=>r.id===a.owner_id);s.querySelector("#mgr-owner").textContent=o?Qs(o):`User ${a.owner_id}`;let l=new Set(a.uids??[]);s.querySelector("#mgr-select").innerHTML=i.filter(r=>r.role===ki&&!r.blocked&&r.id!==a.owner_id).map(r=>`<option value="${r.id}" ${l.has(r.id)?"selected":""}>${f(Qs(r))}</option>`).join("")}catch(a){d.error("Failed to load site managers: "+a.message)}}function It(e,t){e.querySelector("#mgr-save")?.addEventListener("click",async()=>{let s=[...e.querySelectorAll("#mgr-select option:checked")].map(a=>parseInt(a.value,10));try{await k.put(`/sites/${t}/managers`,{uids:s}),d.success("Site managers saved")}catch(a){d.error(a.message)}})}function bi(e){switch(e){case"valid":return'<span class="kp-ssl-valid" uk-icon="icon: lock; ratio: 0.85" uk-tooltip="Valid SSL certificate"></span>';case"self-signed":return'<span class="kp-ssl-self-signed" uk-icon="icon: lock; ratio: 0.85" uk-tooltip="Self-signed certificate"></span>';case"expired":return'<span class="kp-ssl-none" uk-icon="icon: warning; ratio: 0.85" uk-tooltip="Expired certificate"></span>';case"mismatch":return'<span class="kp-ssl-none" uk-icon="icon: warning; ratio: 0.85" uk-tooltip="Certificate does not match this domain"></span>';default:return'<span class="kp-ssl-none" uk-icon="icon: warning; ratio: 0.85" uk-tooltip="No SSL certificate"></span>'}}async function Zs(e,t){try{let s=await k.get(`/ssl-status?domain=${encodeURIComponent(e)}`),a=document.getElementById(`ssl-icon-${t}`);if(a&&(a.outerHTML=bi(s.status)),s.status==="none"){let n=document.getElementById(`domain-link-${t}`);n&&(n.href=`http://${e}`)}}catch{}}function ea(e){e.forEach(t=>Zs(t.Domain,t.ID))}function ta(e,t,s,a=0,n=null,i=[]){let o=e.SiteType!==3&&e.PMAPort>0;return`
        <div class="uk-grid-medium" uk-grid>
            <div class="uk-width-1-2@m">
                <div class="kp-card uk-padding-small">
                    <h3 class="kp-view-title uk-margin-bottom">Site Info</h3>
                    <table class="uk-table uk-table-small uk-table-divider uk-margin-remove">
                        <tbody>
                            <tr><td class="kp-muted">Name</td><td>${e.Name}</td></tr>
                            ${n?`<tr><td class="kp-muted">Parent</td><td><a href="javascript:void(0)" data-action="manage" data-id="${a}" style="color:var(--kp-cyan)">${n}</a></td></tr>`:""}
                            <tr><td class="kp-muted">Internal Port</td><td>:${e.Port}</td></tr>
                            <tr><td class="kp-muted">Type</td><td>${O(e.SiteType)}</td></tr>
                            <tr><td class="kp-muted">Version</td><td>${Q(e)}</td></tr>
                            <tr><td class="kp-muted">Status</td><td>${Y(e.SiteStatus)}</td></tr>
                            <tr><td class="kp-muted">Containers</td><td><div id="sd-health-badges" class="kp-health-badges"></div></td></tr>
                            <tr><td class="kp-muted">Created</td><td>${new Date(e.Created).toLocaleString()}</td></tr>
                        </tbody>
                    </table>
                </div>
                
                ${i.length?`
                <div class="kp-card uk-padding-small uk-margin-small-top">
                    <h3 class="kp-view-title uk-margin-bottom">Site Sync</h3>
                    <p class="kp-muted uk-text-small uk-margin-remove-bottom">
                        Push files and/or database from this site onto its parent or one of its clones.
                    </p>
                    <div class="uk-flex uk-margin-small-top" style="gap:8px">
                        <button class="uk-button kp-btn-secondary kp-btn-sm" id="sync-push-btn">
                            <span uk-icon="cloud-upload"></span> Push Site
                        </button>
                    </div>
                </div>`:""}

                ${o?`
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
                        ${t.length?t.map(sa).join(""):'<p class="kp-muted uk-text-small">No domains configured</p>'}
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
                            <tr>
                                <td class="kp-muted">Host</td>
                                <td>
                                    <div class="kp-sftp-hostip">
                                        <div class="kp-sftp-hostip-col">
                                            <span id="sftp-host-val" class="kp-mono">${location.hostname}</span>
                                            <button class="uk-button kp-btn-secondary kp-btn-sm kp-btn-copy" id="sftp-host-copy-btn" uk-tooltip="Copy the Host">
                                                <span uk-icon="icon: copy; ratio: 0.75"></span>
                                            </button>
                                        </div>
                                        <div class="kp-sftp-hostip-col uk-hidden" id="sftp-ip-col">
                                            <span id="sftp-ip-val" class="kp-mono"></span>
                                            <button class="uk-button kp-btn-secondary kp-btn-sm kp-btn-copy" id="sftp-ip-copy-btn" uk-tooltip="Copy the IP">
                                                <span uk-icon="icon: copy; ratio: 0.75"></span>
                                            </button>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                            <tr><td class="kp-muted">Port</td><td class="kp-mono">2222</td></tr>
                            <tr>
                                <td class="kp-muted">User</td>
                                <td>
                                    <span id="sftp-user-val" class="kp-mono">${s?.Username??e.Name}</span>
                                    <button class="uk-button kp-btn-secondary kp-btn-sm uk-margin-small-left kp-btn-copy" id="sftp-user-copy-btn" uk-tooltip="Copy the Username">
                                        <span uk-icon="icon: copy; ratio: 0.75"></span>
                                    </button>
                                </td>
                            </tr>
                            <tr>
                                <td class="kp-muted">Password</td>
                                <td>
                                    <span id="sftp-pass-display" class="kp-mono kp-sftp-pass" data-revealed="0">\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022</span>
                                    <button class="uk-button kp-btn-secondary kp-btn-sm uk-margin-small-left kp-btn-copy" id="sftp-reveal-btn" uk-tooltip="Reveal the Password">
                                        <span uk-icon="icon: eye; ratio: 0.75"></span>
                                    </button>
                                    <button class="uk-button kp-btn-secondary kp-btn-sm uk-margin-small-left kp-btn-copy" id="sftp-copy-btn" uk-tooltip="Copy the Password">
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
        </div>`}function sa(e){return`<div class="uk-flex uk-flex-between uk-flex-middle kp-config-row" data-domain-id="${e.ID}">
        <div class="uk-flex uk-flex-middle kp-domain-row-inner">
            <span id="ssl-icon-${e.ID}" class="kp-ssl-pending" uk-icon="icon: more; ratio: 0.85"></span>
            <a id="domain-link-${e.ID}" class="uk-text-small kp-mono" href="https://${e.Domain}" target="_blank" rel="noopener noreferrer" style="color:var(--kp-cyan)">${e.Domain}</a>
        </div>
        <button class="kp-config-del" data-action="delete-domain" data-did="${e.ID}" title="Remove">
            <span uk-icon="icon: close; ratio: 0.8"></span>
        </button>
    </div>`}function aa(e,t){e.querySelector("#domain-add-btn")?.addEventListener("click",()=>{e.querySelector("#domain-add-form").classList.remove("uk-hidden")}),e.querySelector("#domain-cancel-btn")?.addEventListener("click",()=>{e.querySelector("#domain-add-form").classList.add("uk-hidden")}),e.querySelector("#domain-save-btn")?.addEventListener("click",async()=>{let s=e.querySelector("#domain-add-input").value.trim();if(s)try{let a=await k.post(`/sites/${t}/domains`,{domain:s});e.querySelector("#domain-list").insertAdjacentHTML("beforeend",sa(a)),Zs(a.Domain,a.ID),e.querySelector("#domain-add-form").classList.add("uk-hidden"),e.querySelector("#domain-add-input").value="",d.success("Domain added")}catch(a){d.error(a.message)}}),e.querySelector("#domain-list")?.addEventListener("click",async s=>{let a=s.target.closest('[data-action="delete-domain"]');if(!(!a||!await P("Remove Domain","Remove this domain from the site?")))try{await k.delete(`/sites/${t}/domains/${a.dataset.did}`),a.closest("[data-domain-id]").remove(),d.success("Domain removed")}catch(i){d.error(i.message)}})}function na(e,t,s=null,a=[]){e.querySelector("#sftp-regen-btn")?.addEventListener("click",async()=>{let o=e.querySelector("#sftp-regen-btn"),l=o.innerHTML;o.disabled=!0,o.innerHTML='<div uk-spinner="ratio: 0.5"></div>';try{let r=await k.post(`/sites/${t}/sftp-regen`),c=e.querySelector("#sftp-pass-display");if(c&&r?.password){c.textContent=r.password,c.dataset.revealed="1";let u=e.querySelector("#sftp-reveal-btn");u&&(u.innerHTML='<span uk-icon="icon: eye-slash; ratio: 0.75"></span>')}d.success("SFTP password regenerated"),x.go("site-detail",{id:String(t)})}catch(r){d.error(r.message),o.disabled=!1,o.innerHTML=l}});let n=async()=>(await k.get(`/sites/${t}/sftp-password`))?.password??"",i=(o,l)=>{if(navigator.clipboard)navigator.clipboard.writeText(o).then(()=>d.success(`${l} copied to clipboard`)).catch(()=>d.error(`Failed to copy ${l.toLowerCase()}`));else{let r=document.createElement("textarea");r.value=o,r.style.cssText="position:fixed;opacity:0",document.body.appendChild(r),r.select(),document.execCommand("copy"),document.body.removeChild(r),d.success(`${l} copied to clipboard`)}};e.querySelector("#sftp-reveal-btn")?.addEventListener("click",async()=>{let o=e.querySelector("#sftp-pass-display"),l=e.querySelector("#sftp-reveal-btn");if(!o)return;if(o.dataset.revealed==="1"){o.textContent="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022",o.dataset.revealed="0",l.innerHTML='<span uk-icon="icon: eye; ratio: 0.75"></span>';return}let r=l.innerHTML;l.disabled=!0,l.innerHTML='<div uk-spinner="ratio: 0.5"></div>';try{o.textContent=await n(),o.dataset.revealed="1",l.innerHTML='<span uk-icon="icon: eye-slash; ratio: 0.75"></span>'}catch(c){d.error(c.message),l.innerHTML=r}finally{l.disabled=!1}}),e.querySelector("#sftp-copy-btn")?.addEventListener("click",async()=>{let o=e.querySelector("#sftp-copy-btn"),l=o.innerHTML;o.disabled=!0,o.innerHTML='<div uk-spinner="ratio: 0.5"></div>';try{let r=await n();r&&i(r,"Password")}catch(r){d.error(r.message)}finally{o.disabled=!1,o.innerHTML=l}}),e.querySelector("#sftp-user-copy-btn")?.addEventListener("click",()=>{let o=e.querySelector("#sftp-user-val")?.textContent.trim();o&&i(o,"Username")}),e.querySelector("#sftp-host-copy-btn")?.addEventListener("click",()=>{let o=e.querySelector("#sftp-host-val")?.textContent.trim();o&&i(o,"Host")}),e.querySelector("#sftp-ip-copy-btn")?.addEventListener("click",()=>{let l=e.querySelector("#sftp-ip-copy-btn")?.dataset.ip;l&&i(l,"IP")}),(async()=>{let o=e.querySelector("#sftp-ip-col"),l=e.querySelector("#sftp-ip-val"),r=e.querySelector("#sftp-ip-copy-btn");if(!(!o||!l||!r))try{let c=await k.get(`/sites/${t}/security/asn/lookup?q=${encodeURIComponent(location.hostname)}`);if(!c?.ip)return;l.textContent=c.ip,r.dataset.ip=c.ip,o.classList.remove("uk-hidden")}catch{}})(),e.querySelector("#pma-open-btn")?.addEventListener("click",async()=>{let o=e.querySelector("#pma-open-btn"),l=o.innerHTML;o.disabled=!0,o.innerHTML='<div uk-spinner="ratio: 0.5"></div> Opening...';try{let r=await k.post(`/sites/${t}/pma-token`);window.open(r.url,"_blank")}catch(r){d.error(r.message)}finally{o.disabled=!1,o.innerHTML=l}}),e.querySelector("#sync-push-btn")?.addEventListener("click",async()=>{let o=await us(s,a,s.SiteType!==3&&s.PMAPort>0);if(!o)return;let l=a.find(u=>u.ID===o.target_id)?.Name??"target";try{await k.post(`/sites/${t}/push`,o)}catch(u){d.error(u.message);return}I("Push Running",`Backing up ${l}, then pushing ${s.Name} onto it.`);let r=Date.now()+1800*1e3,c=setInterval(async()=>{try{let u=await k.get(`/sites/${t}/push-status`);(!u?.active||Date.now()>r)&&(clearInterval(c),T(),u?.active?d.error("Push is taking longer than expected \u2014 check server logs for status"):u?.error?d.error(`Push failed: ${u.error}`):d.success(`Push to ${l} complete`))}catch{}},4e3)})}function ia(){return`
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
        </div>`}function oa(e="",t="",s=301){return`
        <div class="redirect-row uk-flex uk-flex-middle uk-margin-small-bottom" style="gap:8px">
            <input class="uk-input kp-input redirect-source" type="text" placeholder="/old-path" value="${e}" style="flex:1">
            <input class="uk-input kp-input redirect-target" type="text" placeholder="https://example.com/new-path" value="${t}" style="flex:2">
            <select class="uk-select kp-select redirect-code" style="width:90px">
                <option value="301" ${s===301?"selected":""}>301</option>
                <option value="302" ${s===302?"selected":""}>302</option>
                <option value="307" ${s===307?"selected":""}>307</option>
                <option value="308" ${s===308?"selected":""}>308</option>
            </select>
            <a href="javascript:void(0);" class="kp-muted redirect-remove-btn" uk-icon="trash"></a>
        </div>`}async function la(e){let t=document.getElementById("redirects-list");if(!t)return;t.innerHTML="";let s=await k.get(`/sites/${e}/redirects`);t.innerHTML=s.map(a=>oa(a.Source,a.Target,a.Code)).join("")}function ra(e,t){let s=new AbortController,a={signal:s.signal};e.addEventListener("click",n=>{n.target.closest("#redirect-add-btn")&&document.getElementById("redirects-list").insertAdjacentHTML("beforeend",oa()),n.target.closest(".redirect-remove-btn")&&n.target.closest(".redirect-row").remove()},a),e.addEventListener("click",async n=>{if(!n.target.closest("#redirect-save-btn"))return;let i=[...document.querySelectorAll(".redirect-row")].map(o=>({Source:o.querySelector(".redirect-source").value.trim(),Target:o.querySelector(".redirect-target").value.trim(),Code:parseInt(o.querySelector(".redirect-code").value,10)}));try{await k.put(`/sites/${t}/redirects`,i),d.success("Redirects saved")}catch(o){d.error(o.message||"Failed to save redirects")}},a),e.__redirectsAbort?.abort(),e.__redirectsAbort=s}function ca(e){return`
        <div class="kp-card uk-padding uk-margin-top" id="smtp-panel">
            <h3 class="kp-view-title uk-margin-bottom">Outbound SMTP</h3>
            ${e?'<p class="kp-muted uk-text-small">Your app can read <code>/etc/podnest/smtp/settings.json</code> when SMTP is enabled.</p>':""}
            <p class="kp-muted uk-text-small" id="site-smtp-status" role="status"></p>
            <button class="uk-button kp-btn-ghost kp-btn-sm" type="button" id="site-smtp-retry" hidden>Retry</button>

            <fieldset class="uk-fieldset" id="site-smtp-actions" disabled>
                <form class="uk-form-stacked" id="site-smtp-settings">
                    <label class="kp-label">
                        <input class="uk-checkbox" type="checkbox" name="enabled">
                        Enable outbound SMTP
                    </label>

                    <div class="uk-grid-small uk-margin-small-top" uk-grid>
                        <div class="uk-width-1-2@s">
                            <label class="kp-label" for="site-smtp-host">SMTP Host</label>
                            <input class="uk-input kp-input" id="site-smtp-host" name="host" type="text" autocomplete="off">
                        </div>
                        <div class="uk-width-1-4@s">
                            <label class="kp-label" for="site-smtp-port">Port</label>
                            <input class="uk-input kp-input" id="site-smtp-port" name="port" type="number" min="1" max="65535" step="1" required>
                        </div>
                        <div class="uk-width-1-4@s">
                            <label class="kp-label" for="site-smtp-encryption">Encryption</label>
                            <select class="uk-select kp-select" id="site-smtp-encryption" name="encryption">
                                <option value="starttls">STARTTLS</option>
                                <option value="tls">TLS</option>
                            </select>
                        </div>
                        <div class="uk-width-1-3@s">
                            <label class="kp-label" for="site-smtp-username">Username</label>
                            <input class="uk-input kp-input" id="site-smtp-username" name="username" type="text" autocomplete="off">
                        </div>
                        <div class="uk-width-1-3@s">
                            <label class="kp-label" for="site-smtp-from-email">From Email</label>
                            <input class="uk-input kp-input" id="site-smtp-from-email" name="from_email" type="email">
                        </div>
                        <div class="uk-width-1-3@s">
                            <label class="kp-label" for="site-smtp-from-name">From Name</label>
                            <input class="uk-input kp-input" id="site-smtp-from-name" name="from_name" type="text">
                        </div>
                    </div>

                    <button class="uk-button kp-btn-primary kp-btn-sm uk-margin-small-top" type="submit">Save Settings</button>
                </form>

                <hr class="kp-divider">

                <form class="uk-form-stacked" id="site-smtp-credentials">
                    <label class="kp-label" for="site-smtp-password">SMTP Password</label>
                    <p class="kp-muted uk-text-small uk-margin-small" id="site-smtp-password-state" role="status"></p>
                    <input class="uk-input kp-input" id="site-smtp-password" type="password" autocomplete="new-password" maxlength="4096" required>
                    <div class="uk-flex uk-flex-wrap uk-margin-small-top uk-grid-small" uk-grid>
                        <div><button class="uk-button kp-btn-primary kp-btn-sm" type="submit">Save Password</button></div>
                        <div><button class="uk-button kp-btn-ghost kp-btn-sm" id="site-smtp-remove" type="button">Remove Password</button></div>
                    </div>
                </form>

                <hr class="kp-divider">

                <form class="uk-form-stacked" id="site-smtp-test">
                    <label class="kp-label" for="site-smtp-recipient">Test Recipient</label>
                    <input class="uk-input kp-input" id="site-smtp-recipient" type="email" maxlength="254" required>
                    <button class="uk-button kp-btn-ghost kp-btn-sm uk-margin-small-top" type="submit">Send Test Email</button>
                </form>
            </fieldset>
        </div>`}function da(e,t,s){let a=`/sites/${s}/smtp`,n=e.querySelector("#site-smtp-actions"),i=e.querySelector("#site-smtp-status"),o=e.querySelector("#site-smtp-retry"),l=e.querySelector("#site-smtp-settings"),r=e.querySelector("#site-smtp-credentials"),c=e.querySelector("#site-smtp-password"),u=e.querySelector("#site-smtp-password-state"),p=e.querySelector("#site-smtp-remove"),m=e.querySelector("#site-smtp-test"),b=e.querySelector("#site-smtp-recipient"),h=m.querySelector('button[type="submit"]'),g=!1,v=!1,$=!1,y=!1,L=()=>{u.textContent=y?"Password configured":"No password configured",p.disabled=!y,h.disabled=!$||!y},w=async()=>{if(!(g||v)){v=!0,o.hidden=!0,i.textContent="Loading SMTP settings\u2026";try{let S=await k.get(a);if(!S)return;$=S.enabled==="true",y=S.password_set==="true",l.elements.enabled.checked=$,l.elements.host.value=S.host??"",l.elements.port.value=S.port??"587",l.elements.encryption.value=S.encryption??"starttls",l.elements.username.value=S.username??"",l.elements.from_email.value=S.from_email??"",l.elements.from_name.value=S.from_name??"",L(),g=!0,n.disabled=!1,i.textContent=""}catch(S){i.textContent=S.message,o.hidden=!1}finally{v=!1}}},E=async S=>{if(!(v||!g)){v=!0,n.disabled=!0;try{await S()}catch(C){e.isConnected&&d.error(C.message)}finally{v=!1,n.disabled=!1,L()}}};t.addEventListener("click",w),o.addEventListener("click",w),l.addEventListener("submit",S=>{S.preventDefault(),E(async()=>{let C=l.elements,D=C.enabled.checked;if(D&&!y){d.error("Save the SMTP password before enabling outbound SMTP.");return}await k.put(a,{enabled:String(D),host:C.host.value.trim(),port:C.port.value,encryption:C.encryption.value,username:C.username.value.trim(),from_email:C.from_email.value.trim(),from_name:C.from_name.value.trim()},105e3)&&($=D,e.isConnected&&d.success("SMTP settings saved"))})}),r.addEventListener("submit",S=>{S.preventDefault(),E(async()=>{let C=k.put(`${a}/password`,{password:c.value},105e3);c.value="";let D=await C;D&&(y=D.password_set==="true",e.isConnected&&d.success("SMTP password saved"))})}),p.addEventListener("click",()=>{E(async()=>{!await P("Remove SMTP Password","Removing the password disables outbound SMTP for this site.")||!await k._req("DELETE",`${a}/password`,void 0,105e3)||(c.value="",y=!1,$=!1,l.elements.enabled.checked=!1,e.isConnected&&d.success("SMTP password removed"))})}),m.addEventListener("submit",S=>{S.preventDefault(),E(async()=>{await k.post(`${a}/test`,{recipient:b.value.trim()})&&e.isConnected&&d.success("SMTP server accepted the test email")})})}var he=[{id:"ab-threshold",key:"threshold",api:"Threshold",mult:1,label:"Error Responses",help:"4xx/5xx responses within the window that trigger the 429."},{id:"ab-window",key:"window_secs",api:"WindowSecs",mult:1,label:"Window (seconds)",help:"Span the error responses are counted over."},{id:"ab-cooldown",key:"cooldown_secs",api:"CooldownSecs",mult:60,label:"429 Cooldown (minutes)",help:"Hitting the limit again during the cooldown converts it to a ban."},{id:"ab-ban",key:"ban_secs",api:"BanSecs",mult:60,label:"Ban Length (minutes)",help:"How long a ban lasts."},{id:"ab-strikes",key:"perm_strikes",api:"PermStrikes",mult:1,label:"Bans Before Permanent",help:"Bans within the strike window that make the ban permanent."},{id:"ab-strike-win",key:"perm_window_secs",api:"PermWindowSecs",mult:3600,label:"Strike Window (hours)",help:"Span the bans are counted over."}],Bt={id:"ab-escalate",key:"escalate_sites",api:"EscalateSites",mult:1,label:"Sites Before Global Ban",help:"An IP banned on this many sites is banned on all of them."},qt=[{id:"ab-unknown-threshold",key:"unknown_threshold",api:"UnknownThreshold",mult:1,label:"Unknown-Domain Hits",help:"Requests for unregistered domains within the window that trigger the 429."},{id:"ab-unknown-window",key:"unknown_window_secs",api:"UnknownWindowSecs",mult:1,label:"Unknown-Domain Window (seconds)",help:"Span the unregistered-domain requests are counted over."}],be=e=>e?`/sites/${e}/security/autoban`:"/security/autoban";function Je(e=null){let t=e?he:[...he,Bt,...qt];return`
        <div id="autoban-panel">

            <div class="kp-card uk-padding-small uk-margin-bottom">
                <ul class="kp-accordion uk-margin-remove" uk-accordion>
                    <li>
                        <a class="uk-accordion-title" href="#"><h3 class="kp-view-title">Auto-Ban Settings</h3></a>
                        <div class="uk-accordion-content">
                            <div class="uk-flex uk-flex-between uk-flex-top uk-margin-small-bottom" style="gap:8px">
                                <p class="kp-muted uk-text-small uk-margin-remove">
                                    ${e?"Counts this site's 4xx/5xx responses per IP. Leave a field blank to inherit the global value shown.":"The global scope counts hits on unregistered domains using the Unknown-Domain fields; the remaining fields are the per-site defaults unless a site overrides them, and the cooldown and ban values apply to both."}
                                    Bypassed and whitelisted IPs are never counted.
                                </p>
                                <button class="uk-button kp-btn-primary kp-btn-sm" id="ab-save" uk-tooltip="Save Auto-Ban Settings">
                                    <span uk-icon="check"></span>
                                </button>
                            </div>
                            ${e?`
                            <div class="uk-margin-small-bottom">
                                <label class="kp-label">
                                    <input class="uk-checkbox" type="checkbox" id="ab-enabled">
                                    &nbsp;Enable auto-ban for this site
                                </label>
                            </div>`:""}
                            <div class="uk-grid-small uk-child-width-1-2@s uk-child-width-1-3@m" uk-grid>
                                ${t.map(s=>`
                                <div>
                                    <label class="kp-label" for="${s.id}">${s.label}</label>
                                    <input class="uk-input kp-input" id="${s.id}" type="number" min="1" step="1">
                                    <p class="kp-muted uk-text-small uk-margin-small-top">${s.help}</p>
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
        </div>`}function hi(e){if(!e.length)return'<p class="kp-muted uk-text-small uk-margin-remove">No IPs are currently banned.</p>';let t=H();return`
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
            <tbody>${e.map(a=>{let n=!a.Expires;return`
        <tr>
            <td class="kp-mono">${f(a.IP)}</td>
            <td>${a.Hits}</td>
            <td>${a.Strikes}</td>
            <td>${new Date(a.Created).toLocaleString()}</td>
            <td>${n?'<span class="kp-muted">Permanent</span>':new Date(a.Expires).toLocaleString()}</td>
            <td>
                <div class="uk-flex uk-flex-right" style="gap:4px">
                    ${n?"":`
                    <button class="uk-button kp-btn-ghost kp-btn-sm" data-ab-action="permanent" data-id="${a.ID}" uk-tooltip="Ban permanently">
                        <span uk-icon="lock"></span>
                    </button>`}
                    ${t?`
                    <button class="uk-button kp-btn-ghost kp-btn-sm" data-ab-action="allow" data-id="${a.ID}" uk-tooltip="Allow \u2014 add to Security Bypass">
                        <span uk-icon="check"></span>
                    </button>`:""}
                    <button class="uk-button kp-btn-danger kp-btn-sm" data-ab-action="remove" data-id="${a.ID}" uk-tooltip="Remove the ban">
                        <span uk-icon="trash"></span>
                    </button>
                </div>
            </td>
        </tr>`}).join("")}</tbody>
        </table>
        </div>`}async function _t(e,t){let s=e.querySelector("#ab-list");try{let a=await k.get(be(t));s.innerHTML=hi(a??[])}catch(a){s.innerHTML=`<p class="kp-muted uk-text-small uk-margin-remove">Failed to load bans: ${f(a.message)}</p>`}}async function fi(e,t){try{let s=await k.get(`${be(t)}/settings`),a=t?s.global:s,n=t?s.override:s;(t?he:[...he,Bt,...qt]).forEach(l=>{let r=e.querySelector(`#${l.id}`);r&&(r.placeholder=String(a[l.api]/l.mult),r.value=n[l.api]==null?"":String(n[l.api]/l.mult))});let o=e.querySelector("#ab-enabled");o&&(o.checked=!!s.override?.Enabled)}catch(s){d.error("Failed to load auto-ban settings: "+s.message)}}async function gi(e,t){let s=t?he:[...he,Bt,...qt],a={};for(let n of s){let i=e.querySelector(`#${n.id}`).value.trim();if(i===""){if(!t)throw new Error(`${n.label} is required`);a[n.key]=null;continue}let o=Number(i);if(!Number.isInteger(o)||o<1)throw new Error(`${n.label} must be a whole number above 0`);a[n.key]=o*n.mult}t&&(a.enabled=e.querySelector("#ab-enabled").checked),await k.put(`${be(t)}/settings`,a)}function Xe(e,t=null){let s=e.querySelector("#autoban-panel");s&&(s.querySelector("#ab-save")?.addEventListener("click",async a=>{let n=a.currentTarget,i=n.innerHTML;n.disabled=!0,n.innerHTML='<div uk-spinner="ratio: 0.5"></div>';try{await gi(s,t),d.success("Auto-ban settings saved")}catch(o){d.error(o.message)}finally{n.disabled=!1,n.innerHTML=i}}),s.querySelector("#ab-refresh")?.addEventListener("click",()=>_t(s,t)),s.querySelector("#ab-list")?.addEventListener("click",async a=>{let n=a.target.closest("[data-ab-action]");if(!n)return;let i=n.dataset.id,o=n.dataset.abAction,l=n.closest("tr")?.querySelector("td")?.textContent??"this IP";try{if(o==="permanent"){if(!await P("Ban Permanently",`Ban ${l} permanently? It stays banned until removed.`))return;await k.post(`${be(t)}/${i}/permanent`),d.success(`${l} banned permanently`)}else if(o==="allow"){if(!await P("Allow IP",`Add ${l} to Security Bypass? It will skip every security check, including the WAF, on all sites.`))return;await k.post(`${be(t)}/${i}/allow`),d.success(`${l} added to Security Bypass`)}else if(o==="remove"){if(!await P("Remove Ban",`Remove the ban on ${l}? Its strike history is cleared too.`))return;await k.delete(`${be(t)}/${i}`),d.success(`Ban on ${l} removed`)}await _t(s,t)}catch(r){d.error(r.message)}}),fi(s,t),_t(s,t))}function vi(e){return`
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
            <li>${Je(e)}</li>

        </ul>`}function Mt(e,t,s=null){let a=e.querySelector("#kp-waf-pills"),n=e.querySelector("#kp-waf-switcher");if(!a||!n)return;let i=[...a.querySelectorAll(":scope > li")],o=(l,r)=>{if(UIkit.switcher(n).show(l),i.forEach((u,p)=>u.classList.toggle("kp-pill-active",p===l)),!r)return;let c=i[l].dataset.tab;history.replaceState(null,"",s?`#site-detail/${s}/${c}`:l===0?"#waf":`#waf/${c}`)};i.forEach((l,r)=>{l.querySelector(":scope > a").addEventListener("click",c=>{c.preventDefault(),o(r,!0)})}),o(Math.max(0,i.findIndex(l=>l.dataset.tab===t)),!1)}async function At(e,t){let s=document.getElementById("waf-tab-panel");if(!s)return;s.innerHTML=vi(e),Mt(s,t,e),Xe(s,e);let a=document.getElementById("waf-export-btn");a&&(a.href=`/api/sites/${e}/waf/export`);try{let n=await k.get(`/sites/${e}/waf`),i=document.getElementById("waf-override"),o=document.getElementById("waf-site-exclusions");i&&(i.value=String(n.Override??0)),o&&(o.value=n.Exclusions??"");let l=document.getElementById("waf-plugins-list");if(l){let[r,c]=await Promise.all([k.get(`/sites/${e}/waf/available-plugins`),k.get("/settings/waf/plugins"),k.get(`/sites/${e}/waf/plugins`)]),u=new Set(c??[]);!r||r.length===0?l.innerHTML='<span class="kp-muted uk-text-small">No plugins found in local CRS install.</span>':window.matchMedia("(max-width: 959px)").matches?l.innerHTML=`
                    <select multiple class="uk-select kp-select waf-plugin-select" size="${Math.min(r.length,8)}">
                        ${r.map(p=>`
                        <option value="${p}" ${u.has(p)?"selected":""}>${p}</option>
                        `).join("")}
                    </select>`:(l.innerHTML=`
                    <div class="waf-plugin-pills">
                        ${r.map(p=>`
                        <span class="waf-plugin-pill ${u.has(p)?"active":""}"
                            data-plugin="${p}">${p}</span>
                        `).join("")}
                    </div>`,l.querySelectorAll(".waf-plugin-pill").forEach(p=>{p.addEventListener("click",()=>p.classList.toggle("active"))}))}}catch(n){d.error("Failed to load WAF settings: "+n.message)}}function ua(e,t,s){e.addEventListener("submit",async a=>{if(a.target.id!=="waf-override-form")return;a.preventDefault();let n=a.target.querySelector('[type="submit"]'),i=n.innerHTML;n.disabled=!0,n.innerHTML='<div uk-spinner="ratio: 0.6"></div> Saving...';let o=new FormData(a.target),l={override:parseInt(o.get("override"),10),exclusions:o.get("exclusions").trim()};try{await k.put(`/sites/${t}/waf`,l);let r=document.querySelector(".waf-plugin-select"),c=r?[...r.selectedOptions].map(u=>u.value):[...document.querySelectorAll(".waf-plugin-pill.active")].map(u=>u.dataset.plugin);await k.put(`/sites/${t}/waf/plugins`,c),d.success("WAF override saved \u2014 engine recompiling in background")}catch(r){d.error(r.message)}finally{n.disabled=!1,n.innerHTML=i}},{signal:s}),e.addEventListener("change",async a=>{if(a.target.id!=="waf-import")return;let n=a.target.files[0];if(!n)return;let i=new FormData;i.append("file",n);try{let o=await fetch(`/api/sites/${t}/waf/import`,{method:"POST",headers:{"X-CSRF-Token":window.KP?.csrf??""},body:i}),l=o.status===204?null:await o.json().catch(()=>null);if(!o.ok)throw new Error(l?.error||`HTTP ${o.status}`);await At(t),d.success("WAF settings imported")}catch(o){d.error(o.message)}finally{a.target.value=""}},{signal:s})}var yi=[{label:"Cache Flush",cmd:"cache flush"},{label:"Plugin List",cmd:"plugin list"},{label:"Theme List",cmd:"theme list"},{label:"User List",cmd:"user list"},{label:"Core Check",cmd:"core check-update"},{label:"Core Update",cmd:"core update"},{label:"Plugin Updates",cmd:"plugin update --all"},{label:"Theme Updates",cmd:"theme update --all"},{label:"Rewrite Flush",cmd:"rewrite flush"},{label:"Transient Delete",cmd:"transient delete --all"},{label:"Search Replace",cmd:"search-replace '' ''"}];function pa(e){return`
        <div class="kp-wpcli">
            <div class="kp-log-controls" style="flex-wrap:wrap;gap:6px">
                ${yi.map(t=>`
                   <button class="uk-button kp-btn-ghost kp-btn-sm"
                        data-action="wpcli-quick"
                        data-cmd="${t.cmd}">
                        ${t.label}
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
        </div>`}function ma(e,t){let s=e.querySelector("#wpcli-output"),a=e.querySelector("#wpcli-input"),n=e.querySelector("#wpcli-run"),i=e.querySelector("#wpcli-clear"),o=e.querySelector("#wpcli-status"),l=[],r=-1;function c(m,b=""){m.split(`
`).forEach(h=>{if(!h)return;let g=document.createElement("div");b?g.className=b:g.className=h.match(/error|fatal|critical/i)?"kp-log-line-err":h.match(/warning|warn/i)?"kp-log-line-warn":h.match(/success|done\]/i)?"kp-log-line-info":"",g.textContent=h,s.appendChild(g)}),s.scrollTop=s.scrollHeight}function u(m){if(m=m.trim(),!m)return;l.unshift(m),r=-1,c(`wp> ${m}`,"kp-log-line-info"),a.disabled=!0,n.disabled=!0,o&&(o.textContent="Running...");let b=location.protocol==="https:"?"wss":"ws",h=new WebSocket(`${b}://${location.host}/api/sites/${t}/wpcli`);h.onopen=()=>{h.send(JSON.stringify({command:m}))},h.onmessage=g=>{let v=g.data;if(v.trim()==="[done]"){h.close();return}if(v.startsWith("[info]")){c(v,"kp-muted");return}if(v.startsWith("[error]")){c(v,"kp-log-line-err");return}c(v)},h.onerror=()=>{c("[error] WebSocket connection failed","kp-log-line-err")},h.onclose=()=>{a.disabled=!1,n.disabled=!1,o&&(o.textContent="Ready"),a.focus()}}n.addEventListener("click",()=>{u(a.value),a.value=""}),a.addEventListener("keydown",m=>{if(m.key==="Enter"){u(a.value),a.value="",r=-1;return}if(m.key==="ArrowUp"){m.preventDefault(),r<l.length-1&&(r++,a.value=l[r]);return}m.key==="ArrowDown"&&(m.preventDefault(),r>0?(r--,a.value=l[r]):(r=-1,a.value=""))}),e.querySelectorAll('[data-action="wpcli-quick"]').forEach(m=>{m.addEventListener("click",()=>{let b=m.dataset.cmd;if(b.startsWith("search-replace")){a.value=b,a.focus();let h=b.indexOf("''")+1;a.setSelectionRange(h,h);return}u(b)})}),i.addEventListener("click",()=>{s.innerHTML=""});let p=x.go.bind(x);x.go=function(m,b={}){return p(m,b)},a.focus()}var wi=[{label:"Core Only",scope:"core"},{label:"Themes Only",scope:"themes"},{label:"Plugins Only",scope:"plugins"},{label:"All",scope:"all"}];function ba(){return`
        <div id="wpupdates-panel">
            <!-- wp-admin sso -->
            <div class="kp-card uk-padding-small uk-margin-small-bottom">
                <div class="uk-flex uk-flex-between uk-flex-middle uk-margin-small-bottom">
                    <h3 class="kp-view-title">wp-admin Sign-In</h3>
                    <button class="uk-button kp-btn-primary kp-btn-sm" id="wpsso-open" uk-tooltip="Sign in to wp-admin in a new tab">
                        <span uk-icon="sign-in"></span> Open wp-admin
                    </button>
                </div>
                <p class="kp-muted uk-text-small uk-margin-small-bottom">
                    Signs in as the administrator selected below \u2014 every panel user signs in as the same account.
                    With none selected, the site's first administrator is used.
                </p>
                <div class="uk-flex uk-flex-middle" style="gap:8px;max-width:480px">
                    <select class="uk-select kp-input" id="wpsso-user" disabled>
                        <option value="0">First administrator (default)</option>
                    </select>
                </div>
                <p class="kp-muted uk-text-small uk-margin-small-top" id="wpsso-error" hidden></p>
            </div>

            <!-- updates -->
            <div class="kp-card uk-padding-small">
                <div class="uk-flex uk-flex-between uk-flex-middle uk-margin-small-bottom">
                    <h3 class="kp-view-title">Updates</h3>
                    <button class="uk-button kp-btn-ghost kp-btn-sm" id="wpu-check" uk-tooltip="Check for updates now">
                        <span uk-icon="refresh"></span>
                    </button>
                </div>
                <p class="kp-muted uk-text-small uk-margin-small-bottom">
                    Checked nightly at 11 PM. Last checked: <span id="wpu-checked">never</span>
                </p>
                <div id="wpu-status">
                    <div uk-spinner="ratio: 0.6"></div>
                </div>

                <div class="kp-log-controls uk-margin-small-top" style="flex-wrap:wrap;gap:6px">
                    ${wi.map(e=>`
                        <button class="uk-button kp-btn-ghost kp-btn-sm" data-action="wpu-run" data-scope="${e.scope}">
                            ${e.label}
                        </button>`).join("")}
                </div>

                <div class="kp-log-header uk-margin-small-top">
                    <div class="kp-log-dot kp-log-dot-red"></div>
                    <div class="kp-log-dot kp-log-dot-yellow"></div>
                    <div class="kp-log-dot kp-log-dot-green"></div>
                    <span style="font-size:0.72rem;color:var(--kp-text-dim);margin-left:8px" id="wpu-run-status">Ready</span>
                </div>
                <div class="kp-log-wrap" id="wpu-output" style="height:400px"></div>
            </div>
        </div>`}function ka(e,t){return t?.length?`
        <h4 class="uk-margin-small-top uk-margin-remove-bottom uk-text-small">${e} (${t.length})</h4>
        <div class="uk-overflow-auto">
        <table class="uk-table uk-table-small uk-table-divider uk-margin-remove">
            <thead><tr><th>Name</th><th>Installed</th><th>Available</th></tr></thead>
            <tbody>
                ${t.map(s=>`
                    <tr>
                        <td>${f(s.title||s.name)}<div class="kp-muted uk-text-small kp-mono">${f(s.name)}</div></td>
                        <td class="kp-mono">${f(s.version)}</td>
                        <td class="kp-mono">${f(s.update_version)}</td>
                    </tr>`).join("")}
            </tbody>
        </table>
        </div>`:`<p class="kp-muted uk-text-small uk-margin-small-top">${e}: up to date.</p>`}function xi(e){return e?`
        ${e.error?`<p class="kp-log-line-err uk-text-small uk-margin-small-bottom">${f(e.error)}</p>`:""}
        <p class="uk-text-small uk-margin-remove">
            Core: <span class="kp-mono">${f(e.core_version||"unknown")}</span>
            ${e.core_update?`\u2192 <span class="kp-mono kp-log-line-warn">${f(e.core_update)}</span> available`:'<span class="kp-muted">(up to date)</span>'}
        </p>
        ${ka("Plugins",e.plugins)}
        ${ka("Themes",e.themes)}`:'<p class="kp-muted uk-text-small uk-margin-remove">Not checked yet.</p>'}function ha(e,t){e.querySelector("#wpu-status").innerHTML=xi(t),e.querySelector("#wpu-checked").textContent=t?.checked?new Date(t.checked).toLocaleString():"never"}async function Rt(e,t){if(e.querySelector("#wpupdates-panel")){try{let{status:s}=await k.get(`/sites/${t}/wpupdates`);ha(e,s)}catch(s){e.querySelector("#wpu-status").innerHTML=`<p class="kp-log-line-err uk-text-small">${f(s.message)}</p>`}try{let s=await k.get(`/sites/${t}/wpsso`),a=e.querySelector("#wpsso-user");a.innerHTML='<option value="0">First administrator (default)</option>'+s.admins.map(i=>`
            <option value="${i.id}" ${i.id===s.selected?"selected":""}>
                ${f(i.display_name||i.login)} (${f(i.login)})
            </option>`).join(""),s.selected&&!s.admins.some(i=>i.id===s.selected)&&a.insertAdjacentHTML("beforeend",`<option value="${s.selected}" selected>User #${s.selected}</option>`),a.disabled=!1;let n=e.querySelector("#wpsso-error");n.hidden=!s.error,n.textContent=s.error?`Could not list administrators: ${s.error}`:""}catch(s){d.error("Failed to load wp-admin sign-in settings: "+s.message)}}}function fa(e,t){let s=e.querySelector("#wpu-output"),a=e.querySelector("#wpu-run-status"),n=e.querySelector("#wpu-check"),i=e.querySelectorAll('[data-action="wpu-run"]');function o(r,c=""){r.split(`
`).forEach(u=>{if(!u)return;let p=document.createElement("div");p.className=c||(u.match(/error|fatal|critical/i)?"kp-log-line-err":u.match(/warning|warn/i)?"kp-log-line-warn":u.match(/success|^\$ wp|done\]/i)?"kp-log-line-info":""),p.textContent=u,s.appendChild(p)}),s.scrollTop=s.scrollHeight}function l(r,c){i.forEach(u=>{u.disabled=r}),n.disabled=r,a.textContent=c}e.querySelector("#wpsso-user").addEventListener("change",async r=>{try{await k.put(`/sites/${t}/wpsso`,{wp_user_id:parseInt(r.target.value,10)}),d.success("wp-admin sign-in user saved")}catch(c){d.error(c.message)}}),e.querySelector("#wpsso-open").addEventListener("click",async()=>{let r=window.open("","_blank");r&&(r.opener=null);try{let{url:c}=await k.post(`/sites/${t}/wpsso/login`);r?r.location.href=c:window.location.href=c}catch(c){r?.close(),d.error(c.message)}}),n.addEventListener("click",async()=>{let r=n.innerHTML;l(!0,"Checking..."),n.innerHTML='<div uk-spinner="ratio: 0.5"></div>';try{let{status:c}=await k.post(`/sites/${t}/wpupdates/check`,void 0,3e5);ha(e,c),d.success("Update check complete")}catch(c){d.error(c.message)}finally{n.innerHTML=r,l(!1,"Ready")}}),i.forEach(r=>{r.addEventListener("click",async()=>{let c=r.textContent.trim();if(!await P("Apply Updates",`Run "${c}" updates on this site now? Take a backup first if you need a way back.`))return;l(!0,`Running ${c}...`),o(`== ${c} ==`,"kp-log-line-info");let u=location.protocol==="https:"?"wss":"ws",p=new WebSocket(`${u}://${location.host}/api/sites/${t}/wpupdates/run?scope=${encodeURIComponent(r.dataset.scope)}`);p.onmessage=m=>{let b=m.data;if(b.trim()==="[done]"){o(b,"kp-log-line-info"),p.close();return}if(b.trimStart().startsWith("[error]")){o(b,"kp-log-line-err"),p.close();return}o(b)},p.onerror=()=>{o("[error] WebSocket connection failed","kp-log-line-err")},p.onclose=()=>{l(!1,"Ready"),Rt(e,t)}})})}var se=null,V=null;function ga(e,t,s){let a=e.querySelector("#kp-site-pills"),n=e.querySelector("#kp-site-switcher"),i=e.querySelector("#kp-manage-pill"),o=e.querySelector("#kp-manage-dropdown");if(!a||!n)return;let l=["#kp-sec-pills","#kp-waf-pills","#kp-db-pills"].map(m=>e.querySelector(m)).filter(Boolean),r=m=>[...n.children].findIndex(b=>b.contains(m));function c(m,b=!1){UIkit.switcher(n).show(m),a.querySelectorAll(":scope > li[data-pill]").forEach(v=>v.classList.remove("kp-pill-active")),b?(i?.classList.add("kp-pill-active"),o?.querySelectorAll("a[data-switcher]").forEach(v=>{v.classList.toggle("kp-dd-active",parseInt(v.dataset.switcher,10)===m)})):(i?.classList.remove("kp-pill-active"),o?.querySelectorAll("a[data-switcher]").forEach(v=>v.classList.remove("kp-dd-active")));let g=l.find(v=>r(v)===m)?.querySelector(":scope > li.kp-pill-active")?.dataset.tab;history.replaceState(null,"",g?`#site-detail/${t}/${g}`:`#site-detail/${t}`)}a.querySelectorAll(":scope > li[data-pill] > a").forEach(m=>{m.addEventListener("click",b=>{b.preventDefault();let h=parseInt(m.closest("li").dataset.pill,10);c(h,!1)})}),i?.querySelector(".kp-pill-dropdown-btn")?.addEventListener("click",m=>{m.stopPropagation(),o.hidden=!o.hidden,i.classList.toggle("kp-pill-active",!o.hidden)}),o?.querySelectorAll("a[data-switcher]").forEach(m=>{m.addEventListener("click",b=>{b.preventDefault(),o.hidden=!0,c(parseInt(m.dataset.switcher,10),!0)})}),document.addEventListener("click",m=>{o&&!i.contains(m.target)&&(o.hidden=!0)},{capture:!0});let p=s?l.find(m=>[...m.children].some(b=>b.dataset.tab===s)):null;p?c(r(p),!0):UIkit.switcher(n).show(1)}function Si(){return`
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
        </div>`}function Dt(e="",t="",s=!1,a=!1){return`
        <div class="rp-route-row uk-flex uk-flex-middle uk-margin-small-bottom" style="gap:8px">
            <span>Host:</span><input class="uk-input kp-input" style="flex:1" placeholder="example.com" value="${e}" data-field="domain">
            <span>Upstream:</span><input class="uk-input kp-input" style="flex:2" placeholder="https://10.0.0.1:8080" value="${t}" data-field="upstream">
            <label style="white-space:nowrap;font-size:0.75rem;color:var(--kp-text-dim)" title="Send incoming domain as Host header instead of upstream hostname">
                <input type="checkbox" class="uk-checkbox" data-field="pass_host" ${s?"checked":""}> Pass Host
            </label>
            <label style="white-space:nowrap;font-size:0.75rem;color:var(--kp-text-dim)" title="Do not verify the upstream's TLS certificate. Insecure \u2014 only for self-signed or private-CA https upstreams you control">
                <input type="checkbox" class="uk-checkbox" data-field="skip_verify" ${a?"checked":""}> Skip TLS Verify
            </label>
            <button class="uk-button kp-btn-ghost kp-btn-sm rp-remove-row" uk-tooltip="Remove"><span uk-icon="trash"></span></button>
        </div>`}async function $i(e){let t=document.getElementById("rp-routes-list");if(t)try{let s=await k.get(`/sites/${e}/rp-routes`);t.innerHTML=s.length?s.map(a=>Dt(a.Domain,a.Upstream,a.PassHost,a.SkipVerify)).join(""):Dt()}catch(s){d.error("Failed to load routes: "+s.message)}}function Ei(e,t){e.addEventListener("click",async s=>{if(s.target.closest("#rp-add-row")){document.getElementById("rp-routes-list").insertAdjacentHTML("beforeend",Dt());return}if(s.target.closest(".rp-remove-row")){s.target.closest(".rp-route-row").remove();return}if(!s.target.closest("#rp-save-btn"))return;let a=s.target.closest("#rp-save-btn"),n=a.innerHTML;a.disabled=!0,a.innerHTML='<div uk-spinner="ratio: 0.6"></div> Saving...';let i=[...document.querySelectorAll(".rp-route-row")].map(o=>({Domain:o.querySelector('[data-field="domain"]').value.trim(),Upstream:o.querySelector('[data-field="upstream"]').value.trim(),PassHost:o.querySelector('[data-field="pass_host"]').checked,SkipVerify:o.querySelector('[data-field="skip_verify"]').checked})).filter(o=>o.Domain&&o.Upstream);try{await k.put(`/sites/${t}/rp-routes`,i),d.success("Routes saved")}catch(o){d.error(o.message)}finally{a.disabled=!1,a.innerHTML=n}},{signal:se.signal})}function Ti(e){return e.endsWith("-nginx")?"world":e.endsWith("-php")?"code":e.endsWith("-db")?"database":e.endsWith("-redis")?"server":e.endsWith("-varnish")?"grid":e.endsWith("-pma")?"table":e.endsWith("-app")?"laptop":"bolt"}function va(e){let t=e.split("-").pop();return{nginx:"Nginx",php:"PHP-FPM",db:"MariaDB",redis:"Redis",varnish:"Varnish",pma:"phpMyAdmin",app:"App"}[t]??t}function ya(e){switch(e){case"running":return"var(--kp-success)";case"exited":case"stopped":case"dead":return"var(--kp-danger)";case"created":case"configured":case"initialized":case"paused":case"stopping":case"restarting":return"var(--kp-warning)";default:return"var(--kp-text-dim)"}}function Li(e){return!e||!e.length?"":e.filter(t=>!t.name.endsWith("-infra")).map(t=>`
            <span class="kp-health-badge"
                data-container="${f(t.name)}"
                title="Restart the Container"
                style="cursor:pointer;color:${ya(t.status)}">
                <span uk-icon="icon: ${Ti(t.name)}; ratio: 1.1"></span>
                <span class="kp-health-badge-label">${f(va(t.name))}</span>
            </span>
        `).join("")}function Ci(e,t){V&&(V.close(),V=null);let s=document.getElementById("sd-health-badges");if(!s)return;let a=location.protocol==="https:"?"wss":"ws";V=new WebSocket(`${a}://${location.host}/api/sites/${t}/health/stream`);let n=[],i=()=>{s.innerHTML=Li(n),s.querySelectorAll(".kp-health-badge").forEach(o=>{o.addEventListener("click",async()=>{o.style.color=ya("restarting");let l=o.dataset.container,r=l.split("-").pop();try{await k.post(`/sites/${t}/containers/${r}/restart`),d.success(`${va(l)} restarted`)}catch(c){d.error(c.message)}i()})})};V.onmessage=o=>{try{n=JSON.parse(o.data),i()}catch{}},V.onerror=()=>{},V.onclose=()=>{V=null}}async function wa(e,{id:t,tab:s}){let[{site:a,domains:n,sftp:i},o,l]=await Promise.all([k.get(`/sites/${t}`),k.get("/sites"),k.get(`/sites/${t}/configs`)]),r=Array.isArray(o)?o:[],c=r.filter(y=>y.ID===a.ParentID||y.ParentID===a.ID),u=a.SiteType===1||a.SiteType===2,p=[1,2,4,5,7].includes(a.SiteType),m=a.SiteType===6,b=[1,2,4,5,7].includes(a.SiteType),h=[1,2,4,5,7].includes(a.SiteType),g=window.KP?.user?.role===99;if(se&&se.abort(),se=new AbortController,e.innerHTML=`
        <div class="kp-view-header">
            <div class="uk-flex uk-flex-middle" style="gap:12px">
                <button class="kp-btn-icon" id="sd-back"><span uk-icon="arrow-left"></span></button>
                <div class="kp-site-nav-wrap">
                    <select id="sd-site-nav" class="uk-select kp-select">
                        ${r.map(y=>`<option value="${y.ID}" ${y.ID===a.ID?"selected":""}>${y.Name}</option>`).join("")}
                    </select>
                    <span class="kp-site-nav-arrow">&#9660;</span>
                </div>
                ${m?"":Y(a.SiteStatus)}
            </div>
            <div class="uk-flex" style="gap:8px;flex-wrap:wrap">
                ${m?"":`
                ${a.SiteStatus===1?`<button class="uk-button kp-btn-ghost kp-btn-sm" data-action="stop" data-id="${t}" uk-tooltip="Stop the Site"><span uk-icon="ban"></span></button>`:`<button class="uk-button kp-btn-ghost kp-btn-sm" data-action="start" data-id="${t}" uk-tooltip="Start the Site"><span uk-icon="play"></span></button>`}
                <button class="uk-button kp-btn-ghost kp-btn-sm" data-action="restart" data-id="${t}" uk-tooltip="Restart the Site"><span uk-icon="refresh"></span></button>
                <button class="uk-button kp-btn-ghost kp-btn-sm" data-action="flush" data-id="${t}" uk-tooltip="Flush the Caches"><span uk-icon="bolt"></span></button>
                <button class="uk-button kp-btn-ghost kp-btn-sm kp-btn-recreate" id="sd-recreate" uk-tooltip="Recreate &amp; Update the Pod"><span uk-icon="history"></span></button>
                <button class="uk-button kp-btn-ghost kp-btn-sm" id="sd-clone" uk-tooltip="Clone the Site"><span uk-icon="move"></span></button>
                `}
                <button class="uk-button kp-btn-ghost kp-btn-sm" id="sd-rename" uk-tooltip="Rename the Site"><span uk-icon="tag"></span></button>
                <button class="uk-button kp-btn-ghost kp-btn-sm" id="sd-edit" uk-tooltip="Edit the Site"><span uk-icon="pencil"></span></button>
            </div>
        </div>
 
        ${m?`
        <!-- tab pills (reverse proxy) -->
        <ul class="kp-tab-pills" id="kp-site-pills">
            <li data-pill="0"><a href="#">Routes</a></li>
            <li id="kp-manage-pill">
                <a href="javascript:void(0);" class="kp-pill-dropdown-btn">
                    Manage <span uk-icon="icon: chevron-down; ratio: 0.8"></span>
                </a>
                <div class="kp-pill-dropdown" id="kp-manage-dropdown" hidden>
                    <div class="kp-pill-dropdown-section">Config</div>
                    <a href="#" data-switcher="3"><span uk-icon="icon: bolt; ratio: 0.85"></span> Proxy Cache</a>
                    <hr>
                    <div class="kp-pill-dropdown-section">Security</div>
                    <a href="#" data-switcher="4"><span uk-icon="icon: lock; ratio: 0.85"></span> Security</a>
                    <a href="#" data-switcher="5"><span uk-icon="icon: lifesaver; ratio: 0.85"></span> WAF</a>
                    <a href="#" data-switcher="6"><span uk-icon="icon: user; ratio: 0.85"></span> Basic Auth</a>
                    ${g?`<hr>
                    <div class="kp-pill-dropdown-section">Access</div>
                    <a href="#" data-switcher="managers"><span uk-icon="icon: users; ratio: 0.85"></span> Managers</a>`:""}
                </div>
            </li>
            <li data-pill="1"><a href="#">Stats</a></li>
            <li data-pill="2"><a href="#">Logs</a></li>
        </ul>

        <!-- switcher panels -->
        <ul class="uk-switcher" id="kp-site-switcher">
            <li>${Si()}</li>
            <li>${mt(t,a.SiteType)}</li>
            <li>${Lt(t,a.SiteType)}</li>
            <li>${wt(t,l[6])}</li>
            <li>${xe(t)}</li>
            <li id="waf-tab-panel"></li>
            <li>${gt()}</li>
            ${g?`<li>${Ct()}</li>`:""}
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
                    ${u?'<a href="#" data-switcher="3"><span uk-icon="icon: code; ratio: 0.85"></span> PHP</a>':""}
                    <a href="#" data-switcher="${u?4:3}"><span uk-icon="icon: database; ratio: 0.85"></span> MariaDB</a>
                    <a href="#" data-switcher="${u?5:4}"><span uk-icon="icon: bolt; ratio: 0.85"></span> Proxy Cache</a>
                    <a href="#" data-switcher="${u?6:5}"><span uk-icon="icon: server; ratio: 0.85"></span> Redis</a>
                    <a href="#" data-switcher="${u?7:6}"><span uk-icon="icon: world; ratio: 0.85"></span> Varnish</a>
                    ${p?'<a href="#" id="sd-smtp-tab" data-switcher="smtp"><span uk-icon="icon: mail; ratio: 0.85"></span> SMTP</a>':""}
                    <hr>
                    <div class="kp-pill-dropdown-section">Security</div>
                    <a href="#" data-switcher="${u?9:8}"><span uk-icon="icon: lock; ratio: 0.85"></span> Security</a>
                    <a href="#" data-switcher="${u?10:9}"><span uk-icon="icon: lifesaver; ratio: 0.85"></span> WAF</a>
                    <a href="#" data-switcher="${u?11:10}"><span uk-icon="icon: user; ratio: 0.85"></span> Basic Auth</a>
                    <hr>
                    <div class="kp-pill-dropdown-section">Tools</div>
                    ${a.SiteType===1?`<a href="#" data-switcher="${u?12:11}"><span uk-icon="icon: file-text; ratio: 0.85"></span> WP-CLI</a>`:""}
                    ${a.SiteType===1?'<a href="#" data-switcher="wordpress"><span uk-icon="icon: wordpress; ratio: 0.85"></span> WordPress</a>':""}
                    <a href="#" data-switcher="${a.SiteType===1?u?13:12:u?12:11}"><span uk-icon="icon: history; ratio: 0.85"></span> Backups</a>
                    ${h?'<a href="#" data-switcher="database"><span uk-icon="icon: table; ratio: 0.85"></span> Database</a>':""}
                    ${b?`<a href="#" data-switcher="${a.SiteType===1?u?14:13:u?13:12}"><span uk-icon="icon: clock; ratio: 0.85"></span> Crons</a>`:""}
                    <a href="#" data-switcher="${(a.SiteType===1?u?15:14:u?14:13)-(b?0:1)}"><span uk-icon="icon: forward; ratio: 0.85"></span> Redirects</a>
                    <a href="#" data-switcher="files"><span uk-icon="icon: folder; ratio: 0.85"></span> Files</a>
                    ${g?`<hr>
                    <div class="kp-pill-dropdown-section">Access</div>
                    <a href="#" data-switcher="managers"><span uk-icon="icon: users; ratio: 0.85"></span> Managers</a>`:""}
                </div>
            </li>
            <li data-pill="1"><a href="#">Stats</a></li>
            <li data-pill="${u?8:7}"><a href="#">Logs</a></li>
        </ul>

        <!-- switcher panels (driven by pills above) -->
        <ul class="uk-switcher" id="kp-site-switcher">
            <li>${ta(a,n??[],i,a.ParentID??0,r.find(y=>y.ID===a.ParentID)?.Name??null,c)}</li>
            <li>${mt(t,a.SiteType)}</li>
            <li>${Ee(t,1,l[1])}</li>
            ${u?`<li>${Ee(t,2,l[2])}</li>`:""}
            <li>${Ee(t,3,l[3])}</li>
            <li>${wt(t,l[6])}</li>
            <li>${Ee(t,4,l[4])}</li>
            <li>${Ms(t,l[5])}</li>
            <li>${Lt(t,a.SiteType)}</li>
            <li>${xe(t)}</li>
            <li id="waf-tab-panel"></li>
            <li>${gt()}</li>
            ${a.SiteType===1?`<li>${pa(t)}</li>`:""}
            <li>${_s(t)}</li>
            ${b?`<li>${Rs(t)}</li>`:""}
            <li>${ia()}</li>
            ${h?`<li>${Ws(t,a.SiteType)}</li>`:""}
            ${a.SiteType===1?`<li>${ba()}</li>`:""}
            ${g?`<li>${Ct()}</li>`:""}
            ${p?`<li>${ca(!u)}</li>`:""}
            <li>${Xs(t)}</li>
        </ul>`}`,document.getElementById("sd-back").addEventListener("click",()=>x.go("sites")),document.getElementById("sd-edit").addEventListener("click",()=>Ps(a)),document.getElementById("sd-rename").addEventListener("click",async()=>{let y=await ds(a.Name);if(!(!y||y===a.Name)){I("Renaming Site","Moving the database, files, and pod \u2014 this may take a few minutes...");try{await k.post(`/sites/${t}/rename`,{name:y},18e5),T(),d.success(`Site renamed to '${y}'`),x.go("site-detail",{id:t})}catch(L){T(),d.error(L.message)}}}),document.getElementById("sd-site-nav")?.addEventListener("change",y=>{x.go("site-detail",{id:y.target.value})}),ze(e),je(e,s),te(e),Ys(e,t),ua(e,t,se.signal),At(t,s),m){if(Ei(e,t),xt(e,t,se.signal),$i(t),bt(e,t,a.SiteType),ht(t,a.SiteType),vt(e,t),Se(t),ga(e,t,s),g){let y=e.querySelector("#kp-site-switcher"),L=e.querySelector('a[data-switcher="managers"]'),w=e.querySelector("#managers-panel");y&&L&&w&&(L.dataset.switcher=String([...y.children].findIndex(E=>E.contains(w)))),It(e,t),Pt(e,t)}return}document.getElementById("sd-recreate").addEventListener("click",async()=>{I("Recreating Pod","Recreating containers for this site...");try{await k.post(`/sites/${t}/recreate`,{prune:!0}),T(),d.success("Pod recreated"),x.go("site-detail",{id:t})}catch(y){T(),d.error(y.message)}}),document.getElementById("sd-clone")?.addEventListener("click",async()=>{let y=await cs(a.Name);if(y){I("Cloning Site","Copying files and database \u2014 this may take a few minutes...");try{await k.post(`/sites/${t}/clone`,y,6e5),T(),d.success(`Site cloned as '${y.name}'`),x.go("sites")}catch(L){T(),d.error(L.message)}}}),xt(e,t,se.signal),aa(e,t),a.SiteType===1&&ma(e,t),na(e,t,a,c),Bs(e,t),pe(e,t),b&&(Hs(e,t),Ve(e,t)),ra(e,t),la(t);let v=e.querySelector("#kp-site-switcher"),$=e.querySelector('a[data-switcher="files"]');if(v&&$&&($.dataset.switcher=String(v.children.length-1)),Gs(e,t),F(t),p){let y=e.querySelector("#sd-smtp-tab"),L=e.querySelector("#smtp-panel");y.dataset.switcher=String([...v.children].findIndex(w=>w.contains(L))),da(L,y,t)}if(h){let y=e.querySelector('a[data-switcher="database"]'),L=e.querySelector("#dbtools-panel");v&&y&&L&&(y.dataset.switcher=String([...v.children].findIndex(w=>w.contains(L)))),zs(e,t),js(e,s)}if(a.SiteType===1){let y=e.querySelector('a[data-switcher="wordpress"]'),L=e.querySelector("#wpupdates-panel");v&&y&&L&&(y.dataset.switcher=String([...v.children].findIndex(w=>w.contains(L)))),fa(e,t),Rt(e,t)}if(g){let y=e.querySelector('a[data-switcher="managers"]'),L=e.querySelector("#managers-panel");v&&y&&L&&(y.dataset.switcher=String([...v.children].findIndex(w=>w.contains(L)))),It(e,t),Pt(e,t)}Ci(e,t),bt(e,t,a.SiteType),ht(t,a.SiteType),ga(e,t,s),vt(e,t),Se(t),ea(n??[])}var ls=Mn(xn());async function lt(e){let t=document.getElementById("totp-qr-img"),s=document.getElementById("totp-qr-wrap");if(!t||!s)return;if(s.querySelectorAll(".totp-uri-text").forEach(n=>n.remove()),typeof ls.default<"u")try{let n=await new Promise((i,o)=>{ls.default.toDataURL(e,{width:220,margin:2},(l,r)=>{l?o(l):i(r)})});t.src=n,t.style.display="";return}catch{}let a=document.createElement("p");a.className="totp-uri-text kp-muted uk-text-small",a.style.wordBreak="break-all",a.textContent=e,s.appendChild(a)}function rt(e){document.getElementById("kp-backup-codes-modal")?.remove();let s=`
        <div id="kp-backup-codes-modal" uk-modal="bg-close:false;esc-close:false">
            <div class="uk-modal-dialog kp-modal uk-modal-body" style="max-width:480px">
                <h3 class="uk-modal-title" style="color:var(--kp-yellow,#f0b429)">
                    <span uk-icon="warning"></span>&nbsp;Save Your Backup Codes
                </h3>
                <p class="kp-muted uk-text-small uk-margin-small-bottom">
                    These codes let you access your account if you lose your authenticator.
                    Each code works <strong>once only</strong>. Keep them somewhere safe.
                </p>
                <div class="kp-backup-codes-grid uk-margin-small">${e.map(n=>`<code class="kp-backup-code">${n}</code>`).join("")}</div>
                <p class="kp-muted uk-text-small uk-margin-small-top">
                    These codes will <strong>not</strong> be shown again.
                </p>
                <div class="uk-flex uk-flex-right uk-margin-top" style="gap:8px">
                    <button id="kp-backup-copy-btn" class="uk-button kp-btn-ghost">Copy All</button>
                    <button id="kp-backup-done-btn" class="uk-button kp-btn-primary">I've Saved These</button>
                </div>
            </div>
        </div>`;document.body.insertAdjacentHTML("beforeend",s);let a=UIkit.modal("#kp-backup-codes-modal");a.show(),document.getElementById("kp-backup-copy-btn").addEventListener("click",()=>{let n=e.join(`
`),i=document.getElementById("kp-backup-copy-btn");if(navigator.clipboard)navigator.clipboard.writeText(n).then(()=>{i.textContent="Copied!"});else{let o=document.createElement("textarea");o.value=n,o.style.cssText="position:fixed;opacity:0",document.body.appendChild(o),o.select();try{document.execCommand("copy"),i.textContent="Copied!"}catch{}o.remove()}}),document.getElementById("kp-backup-done-btn").addEventListener("click",()=>{a.hide(),document.getElementById("kp-backup-codes-modal")?.remove(),x.go("users")})}function Sn(e){document.body.insertAdjacentHTML("beforeend",`
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
        </div>`);let s=UIkit.modal("#kp-create-user-modal");s.show(),document.getElementById("create-user-form").addEventListener("submit",async a=>{a.preventDefault();let n=a.target.querySelector('[type="submit"]'),i=n.innerHTML;n.disabled=!0,n.innerHTML='<div uk-spinner="ratio: 0.6"></div> Creating...';let o=new FormData(a.target),l={fname:o.get("fname").trim(),lname:o.get("lname").trim(),uname:o.get("uname").trim(),email:o.get("email").trim(),phone:o.get("phone").trim(),password:o.get("password"),role:parseInt(o.get("role")),notify_email:o.get("notify_email")==="on",notify_sms:o.get("notify_sms")==="on"};try{let r=Z(await k.post("/users",l));document.getElementById("users-grid").insertAdjacentHTML("beforeend",ct(r)),d.success(`User '${r.uname}' created`),document.getElementById("create-user-form").style.display="none",document.getElementById("cu-totp-section").style.display="",So(r.id,s)}catch(r){d.error(r.message),n.disabled=!1,n.innerHTML=i}}),document.getElementById("kp-create-user-modal").addEventListener("hidden",()=>document.getElementById("kp-create-user-modal")?.remove())}function So(e,t){let s=()=>{t.hide(),document.getElementById("kp-create-user-modal")?.remove(),x.go("users")};document.getElementById("cu-totp-skip-btn").addEventListener("click",s),document.getElementById("cu-totp-setup-btn").addEventListener("click",async()=>{let a=document.getElementById("cu-totp-setup-btn");a.disabled=!0,a.textContent="Setting up\u2026";try{let n=await k.post(`/users/${e}/totp/setup`,{});document.getElementById("totp-secret-text").textContent=n.secret,document.getElementById("totp-setup-area").style.display="",document.getElementById("cu-totp-skip-btn").style.display="none",await lt(n.uri)}catch(n){d.error(n.message),a.disabled=!1,a.textContent="Enable TOTP"}}),document.getElementById("cu-totp-confirm-btn").addEventListener("click",async()=>{let a=document.getElementById("totp-confirm-code").value.trim();if(a.length!==6){d.error("Enter a 6-digit code");return}let n=document.getElementById("cu-totp-confirm-btn");n.disabled=!0;try{let i=await k.post(`/users/${e}/totp/confirm`,{code:a});t.hide(),document.getElementById("kp-create-user-modal")?.remove(),d.success("TOTP enabled"),i.backup_codes?.length?rt(i.backup_codes):x.go("users")}catch(i){d.error(i.message),n.disabled=!1}})}async function $n(e,t){document.getElementById("kp-edit-user-modal")?.remove();let s;try{s=Z(await k.get(`/users/${t}`))}catch(p){d.error(p.message);return}let a=window.KP?.user?.role===99,n=Number(t)===Number(window.KP?.user?.id),i=s.node_uid>0,o=`
        <div id="kp-edit-user-modal" uk-modal>
            <div class="uk-modal-dialog kp-modal uk-modal-body uk-width-large">
                <button class="uk-modal-close-default" type="button" uk-close></button>
                <h3 class="kp-view-title">Edit User \u2014 ${s.uname}</h3>
                ${i?'<p class="kp-muted uk-text-small uk-margin-small-top">Synced from the parent node \u2014 changes here are overwritten the next time this user signs in from the parent.</p>':""}
                <form id="edit-user-form" class="uk-form-stacked uk-margin-top">
                    <div class="uk-grid-small" uk-grid>
                        ${a?`
                        <div class="uk-width-1-1">
                            <label class="kp-label">Username</label>
                            <input class="uk-input kp-input" name="uname" type="text" value="${f(s.uname)}" autocomplete="off">
                        </div>`:""}
                        <div class="uk-width-1-2@s">
                            <label class="kp-label">First Name</label>
                            <input class="uk-input kp-input" name="fname" type="text" value="${f(s.fname)}" required>
                        </div>
                        <div class="uk-width-1-2@s">
                            <label class="kp-label">Last Name</label>
                            <input class="uk-input kp-input" name="lname" type="text" value="${f(s.lname)}" required>
                        </div>
                        <div class="uk-width-1-2@s">
                            <label class="kp-label">Email</label>
                            <input class="uk-input kp-input" name="email" type="email" value="${f(s.email)}" required>
                        </div>
                        <div class="uk-width-1-2@s">
                            <label class="kp-label">Phone</label>
                            <input class="uk-input kp-input" name="phone" type="tel" value="${f(s.phone||"")}" required>
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
                        ${i?"":`
                        <div class="uk-width-1-2@s">
                            <label class="kp-label">New Password</label>
                            <input class="uk-input kp-input" name="password" type="password" placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" uk-tooltip="leave blank to keep">
                        </div>`}
                        ${n&&!i?`
                        <div class="uk-margin" id="edit-user-current-pw">
                            <label class="uk-form-label">Current Password</label>
                            <input class="uk-input kp-input" name="current_password" type="password" placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" uk-tooltip="required when changing your own password">
                        </div>`:""}                      
                    </div>
                    <div class="uk-flex uk-flex-right uk-margin-top" style="gap:8px">
                        <button type="button" class="uk-button kp-btn-ghost uk-modal-close">Cancel</button>
                        <button type="submit" class="uk-button kp-btn-primary">Save Changes</button>
                    </div>
                </form>
                
                ${a&&s.role===50?`
                <hr class="uk-divider-muted uk-margin-top">

                <div id="edit-user-sites">
                    <h4 class="uk-margin-small-bottom kp-view-title">Assigned Sites</h4>
                    <div id="edit-user-sites-list"><div uk-spinner="ratio: 0.6"></div></div>
                </div>`:""}

                <hr class="uk-divider-muted uk-margin-top" ${i?'style="display:none"':""}>

                <div id="totp-section" ${i?'style="display:none"':""}>
                    <h4 class="uk-margin-small-bottom kp-view-title">Two-Factor Authentication</h4>
                    ${s.totp_enabled?`<div class="uk-flex uk-flex-middle" style="gap:12px">
                            <span class="kp-badge kp-badge-admin" style="font-size:0.75rem">Enabled</span>
                            <button id="totp-disable-btn" class="uk-button kp-btn-secondary kp-btn-sm">Disable TOTP</button>
                           </div>
                           ${n?`<div class="uk-flex uk-margin-small-top" style="gap:8px">
                            <input class="uk-input kp-input" id="totp-disable-password" type="password" placeholder="Current password">
                            <input class="uk-input kp-input" id="totp-disable-code" type="text" inputmode="numeric" placeholder="TOTP or backup code">
                           </div>`:""}`:`<div class="uk-flex uk-flex-middle" style="gap:12px">
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
        </div>`;document.body.insertAdjacentHTML("beforeend",o);let l=UIkit.modal("#kp-edit-user-modal");l.show(),document.getElementById("edit-user-form").addEventListener("submit",async p=>{p.preventDefault();let m=p.target.querySelector('[type="submit"]'),b=m.innerHTML;m.disabled=!0,m.innerHTML='<div uk-spinner="ratio: 0.6"></div> Saving...';let h=new FormData(p.target),g={fname:h.get("fname").trim(),lname:h.get("lname").trim(),email:h.get("email").trim(),phone:h.get("phone").trim(),notify_email:h.get("notify_email")==="on",notify_sms:h.get("notify_sms")==="on"};if(a){g.role=parseInt(h.get("role"));let $=h.get("uname");$&&(g.uname=$.trim())}let v=h.get("password");v&&(g.password=v),v&&n&&(g.current_password=h.get("current_password"));try{await k.put(`/users/${t}`,g),l.hide(),document.getElementById("kp-edit-user-modal")?.remove(),d.success("User updated"),x.go("users")}catch($){d.error($.message),m.disabled=!1,m.innerHTML=b}});let r=document.getElementById("totp-setup-btn");r&&r.addEventListener("click",async()=>{r.disabled=!0,r.textContent="Setting up\u2026";try{let p=await k.post(`/users/${t}/totp/setup`,{});document.getElementById("totp-secret-text").textContent=p.secret,document.getElementById("totp-setup-area").style.display="",await lt(p.uri)}catch(p){d.error(p.message),r.disabled=!1,r.textContent="Enable TOTP"}});let c=document.getElementById("totp-confirm-btn");c&&c.addEventListener("click",async()=>{let p=document.getElementById("totp-confirm-code").value.trim();if(p.length!==6){d.error("Enter a 6-digit code");return}c.disabled=!0;try{let m=await k.post(`/users/${t}/totp/confirm`,{code:p});l.hide(),document.getElementById("kp-edit-user-modal")?.remove(),d.success("TOTP enabled"),m.backup_codes?.length?rt(m.backup_codes):x.go("users")}catch(m){d.error(m.message),c.disabled=!1}});let u=document.getElementById("totp-disable-btn");if(u&&u.addEventListener("click",async()=>{u.disabled=!0;try{await k.delete(`/users/${t}/totp`,n?{current_password:document.getElementById("totp-disable-password").value,code:document.getElementById("totp-disable-code").value.trim()}:void 0),d.success("TOTP disabled"),l.hide(),document.getElementById("kp-edit-user-modal")?.remove(),x.go("users")}catch(p){d.error(p.message),u.disabled=!1}}),document.getElementById("kp-edit-user-modal").addEventListener("hidden",()=>document.getElementById("kp-edit-user-modal")?.remove()),a&&s.role===50){let p=document.getElementById("edit-user-sites-list");try{let m=await k.get(`/users/${t}/sites`);p.innerHTML=m?.length?`<ul class="uk-list uk-list-collapse uk-margin-remove">${m.map(b=>`<li>${f(b.name)}</li>`).join("")}</ul>`:'<p class="kp-muted uk-text-small uk-margin-remove">No sites assigned.</p>'}catch(m){p.innerHTML="",d.error(m.message)}}}async function En(e){if(!H()){e.innerHTML=R("Access denied");return}let t=await k.get("/users");e.innerHTML=`
        <div class="kp-view-header">
            <h1 class="kp-view-title kp-cursor" style="font-size:2rem;">Users</h1>
            <button class="uk-button kp-btn-primary" id="users-new-btn">
                <span uk-icon="plus"></span> New User
            </button>
        </div>
        <div class="kp-list-grid" id="users-grid">
            ${t.map(s=>ct(Z(s))).join("")}
        </div>`,document.getElementById("users-new-btn").addEventListener("click",()=>Sn(e)),$o(e)}function ct(e){let t=e.role===99?'<span class="kp-badge kp-badge-admin">Admin</span>':'<span class="kp-badge kp-badge-manager">Manager</span>',s=[e.notify_email?'<span uk-icon="icon: mail; ratio: 0.85" uk-tooltip="Email notifications on" style="color:var(--kp-success)"></span>':'<span uk-icon="icon: mail; ratio: 0.85" style="color:var(--kp-text-dim)" uk-tooltip="Email notifications off"></span>',e.notify_sms?'<span uk-icon="icon: receiver; ratio: 0.85" uk-tooltip="SMS notifications on" style="color:var(--kp-success)"></span>':'<span uk-icon="icon: receiver; ratio: 0.85" style="color:var(--kp-text-dim)" uk-tooltip="SMS notifications off"></span>'].join(" "),a=`${e.fname?.[0]??""}${e.lname?.[0]??""}`.toUpperCase();return`<div class="kp-list-card" data-user-id="${e.id}">
        <!-- avatar + full name -->
        <div class="kp-list-card-header">
            <span class="kp-list-card-avatar">${f(a)}</span>
            <span class="kp-list-card-title">${f(e.fname)} ${f(e.lname)}</span>
        </div>

        <!-- details -->
        <div class="kp-list-card-body">
            ${N("Username",f(e.uname),"kp-mono")}
            ${N("Email",f(e.email))}
            ${N("Role",`${t}${e.node_uid>0?' <span class="kp-badge kp-badge-manager" uk-tooltip="Synced from the parent node">Synced</span>':""}${e.blocked?' <span class="kp-status kp-status-error">Blocked</span>':""}`,"kp-list-card-value-wrap")}
            ${N("2FA",e.totp_enabled?'<span uk-icon="icon: check; ratio: 0.9" style="color:var(--kp-success)"></span>':'<span uk-icon="icon: close; ratio: 0.9" style="color:var(--kp-text-dim)"></span>')}
            ${N("Notify",s)}
            ${N("Created",f(e.created),"kp-muted kp-mono")}
        </div>

        <!-- action buttons -->
        <div class="kp-list-card-actions">
            <span class="kp-list-card-spacer"></span>
            ${e.node_uid>0&&e.id!==window.KP.user.id?`
            <button class="uk-button kp-btn-ghost kp-btn-sm" data-action="toggle-block-user" data-uid="${e.id}" data-blocked="${e.blocked?1:0}" uk-tooltip="${e.blocked?"Unblock":"Block"} the User">
                <span uk-icon="icon: ${e.blocked?"unlock":"lock"};"></span>
            </button>`:""}
            <button class="uk-button kp-btn-ghost kp-btn-sm" data-action="edit-user" data-uid="${e.id}" title="Edit" uk-tooltip="Edit the User">
                <span uk-icon="icon: pencil;"></span>
            </button>
            <button class="uk-button kp-btn-secondary kp-btn-sm" data-action="delete-user" data-uid="${e.id}" title="Delete" uk-tooltip="Delete the User">
                <span uk-icon="icon: trash;"></span>
            </button>
        </div>
    </div>`}function $o(e){e.addEventListener("click",async t=>{let s=t.target.closest('[data-action="delete-user"]');if(!(!s||!await P("Delete User","Delete this user? This cannot be undone.")))try{await k.delete(`/users/${s.dataset.uid}`),s.closest(".kp-list-card").remove(),d.success("User deleted")}catch(n){d.error(n.message)}}),e.addEventListener("click",async t=>{let s=t.target.closest('[data-action="edit-user"]');s&&$n(e,s.dataset.uid)}),e.addEventListener("click",async t=>{let s=t.target.closest('[data-action="toggle-block-user"]');if(!s)return;let a=s.dataset.blocked!=="1";if(await P(a?"Block User":"Unblock User",a?"Block this synced user? They are signed out here and can no longer sign in to this node from the parent.":"Unblock this synced user?"))try{await k.put(`/users/${s.dataset.uid}/blocked`,{blocked:a});let i=Z(await k.get(`/users/${s.dataset.uid}`));s.closest(".kp-list-card").outerHTML=ct(i),d.success(a?"User blocked":"User unblocked")}catch(i){d.error(i.message)}})}async function Tn(e,t={}){if(!H()){e.innerHTML=R("Access denied");return}e.innerHTML=`
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
            <li>${Je()}</li>

        </ul>`,Eo(e),Mt(e,t.tab),Ln(e),Xe(e)}async function Ln(e){try{let t=await k.get("/settings/waf");if(!e.querySelector("#sec-waf-enabled"))return;e.querySelector("#sec-waf-enabled").checked=!!t.Enabled,e.querySelector("#sec-waf-audit").checked=!!t.AuditLog,e.querySelector("#sec-waf-mode").value=String(t.Mode??0),e.querySelector("#sec-waf-paranoia").value=String(t.ParanoiaLevel??1),e.querySelector("#sec-waf-exclusions").value=t.Exclusions??""}catch(t){d.error("Failed to load WAF settings: "+t.message)}}function Eo(e){e.querySelector("#sec-waf-save")?.addEventListener("click",async()=>{let t=e.querySelector("#sec-waf-save"),s=t.innerHTML;t.disabled=!0,t.innerHTML='<div uk-spinner="ratio: 0.5"></div>';try{await k.put("/settings/waf",{enabled:e.querySelector("#sec-waf-enabled").checked,mode:parseInt(e.querySelector("#sec-waf-mode").value,10),paranoia_level:parseInt(e.querySelector("#sec-waf-paranoia").value,10),audit_log:e.querySelector("#sec-waf-audit").checked,exclusions:e.querySelector("#sec-waf-exclusions").value.trim()}),d.success("WAF settings saved \u2014 engine recompiling in background")}catch(a){d.error(a.message)}finally{t.disabled=!1,t.innerHTML=s}}),e.querySelector("#sec-waf-import")?.addEventListener("change",async t=>{let s=t.target.files[0];if(!s)return;let a=new FormData;a.append("file",s);try{let n=await fetch("/api/settings/waf/import",{method:"POST",headers:{"X-CSRF-Token":window.KP?.csrf??""},body:a}),i=n.status===204?null:await n.json().catch(()=>null);if(!n.ok)throw new Error(i?.error||`HTTP ${n.status}`);await Ln(e),d.success("WAF settings imported")}catch(n){d.error(n.message)}finally{t.target.value=""}})}x.register("dashboard",e=>$s(e));x.register("sites",e=>ws(e));x.register("site-detail",(e,t)=>wa(e,t));x.register("users",e=>En(e));x.register("nodes",e=>ee(e));x.register("settings",(e,t)=>ft(e,t));x.register("security",(e,t)=>Ts(e,t));x.register("waf",(e,t)=>Tn(e,t));x.register("admin-logs",e=>ps(e));x.register("audit-log",e=>hs(e));document.addEventListener("keydown",e=>{let t=e.target;t?.matches?.("input, textarea, select, [contenteditable='true']")&&(t.closest?.(".CodeMirror")||t.id==="wpcli-input"&&(e.key==="ArrowUp"||e.key==="ArrowDown")||["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","Home","End"," "].includes(e.key)&&e.stopPropagation())},!0);document.addEventListener("click",e=>{let t=e.target.closest("[data-view]");t&&(e.preventDefault(),x.go(t.dataset.view))});document.addEventListener("click",async e=>{let t=e.target.closest("[data-action]");if(!t)return;e.stopPropagation();let{action:s,id:a}=t.dataset;switch(s){case"manage":x.go("site-detail",{id:a});break;case"start":await dt(a,"start","Starting Site","Starting all containers - please wait...");break;case"stop":await dt(a,"stop","Stopping Site","Gracefully stopping all containers - please wait...");break;case"restart":await dt(a,"restart","Restarting Site","Restarting all containers - please wait...");break;case"flush":await dt(a,"flush","Flushing Caches","Clearing container caches - please wait...");break;case"delete":await To(a);break;case"recreate":I("Recreating Pod","Recreating containers for this site - this may take a few minutes...");try{await k.post(`/sites/${a}/recreate`,{prune:!0}),T(),d.success("Pod recreated"),x.go("sites")}catch(n){T(),d.error(n.message)}break}});document.addEventListener("kp:bulk-action",async e=>{let{action:t,ids:s}=e.detail;if(!s.length)return;let a={start:"Starting",stop:"Stopping",restart:"Restarting",flush:"Flushing Caches",recreate:"Recreating"},n=t==="recreate"?"Please hold while we update your Pods":"Please wait...",i=t==="recreate"?{prune:!0}:void 0,o=t==="recreate"?1200*1e3:void 0;I(`${a[t]} ${s.length} Site${s.length!==1?"s":""}`,n);let l=await Promise.allSettled(s.map(c=>k.post(`/sites/${c}/${t}`,i,o)));T();let r=l.filter(c=>c.status==="rejected").length;r===0?d.success(`${t.charAt(0).toUpperCase()+t.slice(1)} complete for ${s.length} site${s.length!==1?"s":""}`):d.error(`${r} of ${s.length} sites failed \u2014 check logs`),["start","stop","restart","recreate"].includes(t)&&x.go("sites")});async function dt(e,t,s,a){I(s,a);try{if(await k.post(`/sites/${e}/${t}`),T(),d.success(s+" complete"),t!=="flush"){let{view:n,params:i}=Re();x.go(n,i)}}catch(n){T(),d.error(n.message)}}async function To(e){if(!await P("Delete Site",`This will stop and permanently remove the pod and all its data. Are you sure?

A final backup will be created before deletion. This may take a moment.`))return;I("Deleting Site","Creating final backup and removing the pod \u2014 please wait...");let s;try{s=await fetch(`/api/sites/${e}`,{method:"DELETE",headers:{"X-CSRF-Token":window.KP?.csrf??""}})}catch{}if(T(),s?.status===409){let i=await s.json().catch(()=>null);d.error(i?.error||"Site is busy \u2014 try again when its current job finishes");return}if(s?.ok&&s.headers.get("Content-Type")?.includes("gzip")){let o=(s.headers.get("Content-Disposition")??"").match(/filename="([^"]+)"/)?.[1]??`${e}_final.tar.gz`,l=await s.blob(),r=document.createElement("a");r.href=URL.createObjectURL(l),r.download=o,r.click(),URL.revokeObjectURL(r.href),d.success("Site deleted. Final backup downloaded."),x.go("sites");return}let a=!1,n=0;for(;!a&&n<10;){try{await new Promise(o=>setTimeout(o,2e3)),a=!(await k.get("/sites")).find(o=>o.ID===parseInt(e))}catch{}n++}a?(d.success("Site deleted. Final backup saved to S3."),x.go("sites")):d.error("Delete failed - site still exists after 20s")}if(window.KP?.user?.role===99){let e=document.getElementById("kp-resource-warning"),t=document.getElementById("kp-resource-warning-msg"),s=async()=>{try{let a=await k.get("/settings/resource-warning");a?.active&&e&&t?(t.textContent=`${a.current_mb}MB used, threshold ${a.threshold_mb}MB \u2014 throttling ${a.offender}.`,e.style.display=""):e&&(e.style.display="none")}catch{}};s(),setInterval(s,3e4)}window.addEventListener("hashchange",()=>{if(x._ownHashChange)return;let{view:e,params:t}=Re();x.go(e,t)});(()=>{let e=document.getElementById("kp-totop");if(!e)return;let t=()=>{e.classList.toggle("is-visible",window.scrollY>150)};window.addEventListener("scroll",t,{passive:!0}),t(),e.addEventListener("click",()=>{window.scrollTo({top:0,behavior:"smooth"})})})();(()=>{let e=document.querySelectorAll(".kp-logout-link");e.length&&e.forEach(t=>{t.addEventListener("click",async s=>{s.preventDefault(),await fetch("/logout",{method:"POST",headers:{"X-CSRF-Token":window.KP?.csrf??""}}),window.location.href="/login"})})})();(()=>{let e=document.querySelectorAll(".kp-panel-update-btn");e.length&&e.forEach(t=>{t.addEventListener("click",async s=>{if(s.preventDefault(),!!await P("Update PodNest","PodNest will update and restart, and the panel will be unavailable for a minute or two. Continue?"))try{await k.post("/settings/panel-update"),e.forEach(a=>{a.disabled=!0}),d.success("The update has been queued, please wait a minute or 2 and refresh")}catch(a){d.error(a.message)}})})})();(()=>{let e=document.getElementById("kp-bn-more"),t=document.getElementById("kp-bn-more-menu"),s=document.getElementById("kp-bn-backdrop");if(!e||!t||!s)return;let a=n=>{t.hidden=!n,s.hidden=!n,e.classList.toggle("kp-bn-open",n)};e.addEventListener("click",()=>a(t.hidden)),s.addEventListener("click",()=>a(!1)),t.addEventListener("click",n=>{n.target.closest("[data-view]")&&a(!1)})})();(()=>{let e=document.querySelectorAll(".kp-pair-code-link");e.length&&e.forEach(t=>{t.addEventListener("click",async s=>{s.preventDefault();try{Lo(await k.post("/nodes/pair-code"))}catch(a){d.error(a.message)}})})})();function Lo({code:e,url:t,expires_in:s}){let a="kp-pair-code-modal";document.getElementById(a)?.remove();let n=`
        <div id="${a}" uk-modal>
            <div class="uk-modal-dialog kp-modal uk-modal-body" style="max-width:460px">
                <h3 class="uk-modal-title">Pairing Code</h3>
                <p class="kp-muted uk-text-small">
                    On the parent node, choose Add Node and enter this URL and code.
                    The code works once, and only for this URL.
                </p>
                <label class="kp-label">URL</label>
                <input class="uk-input kp-input" type="text" readonly value="${f(t)}">
                <label class="kp-label uk-margin-small-top">Code</label>
                <input class="uk-input kp-input" type="text" readonly value="${f(e)}"
                    style="letter-spacing:0.2em;font-size:1.2rem;text-align:center">
                <p class="kp-muted uk-text-small uk-margin-small-top">
                    Expires in <span id="kp-pair-code-ttl"></span>
                </p>
                <div class="uk-flex uk-flex-right uk-margin-top">
                    <button class="uk-button kp-btn-ghost uk-modal-close">Close</button>
                </div>
            </div>
        </div>`;document.body.insertAdjacentHTML("beforeend",n);let i=document.getElementById(a),o=document.getElementById("kp-pair-code-ttl"),l=s,r=()=>{if(l<=0){o.textContent="\u2014 expired",clearInterval(c);return}o.textContent=`${Math.floor(l/60)}:${String(l%60).padStart(2,"0")}`,l--},c=setInterval(r,1e3);r(),i.addEventListener("hidden",()=>{clearInterval(c),setTimeout(()=>i.remove(),300)},{once:!0}),UIkit.modal(i).show()}var{view:Co,params:Po}=Re();x.go(Co,Po);})();
