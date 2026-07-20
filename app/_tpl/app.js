/* ============================================================
   节点专属 App · 通用壳渲染器(产品版 · site/apps/_tpl/)
   一个 app = index.html(拷模版·不改)+ data.json(填数据·Researcher 只动这个)
   数据契约(_design/tpl.html 定稿):
     { meta:{title,icon,kind,color,asof},
       modules:[ {type,icon,title,asof,sim,sources:[{label,url}],note,data:{…}}
               | {type,icon,title,state:'pending',pendingHint:'…'} ] }
   六模块:numcompare / opinions / timeline / minichart / searchrow / rawtable
   数据查不到 → state:'pending' → 自动渲染「待补」占位 · 绝不装满
   URL 参数:?node=<节点名>&nid=<数字id>(relation-explorer 传节点上下文)
            &embed=1(抽屉 iframe 内:不渲染大头 · 头由抽屉代劳)
   ============================================================ */
'use strict';

const APP_CTX = (() => {
  const q = new URLSearchParams(location.search);
  return { node: q.get('node') || '', nid: q.get('nid') || '', embed: q.get('embed') === '1' };
})();

function _esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function srcChips(sources){
  if(!sources||!sources.length) return '';
  return `<div class="mod-srcs">${sources.map(s=>
    s.url?`<a class="mod-src" href="${_esc(s.url)}" target="_blank" rel="noopener">${_esc(s.label)} ↗</a>`
         :`<span class="mod-src">${_esc(s.label)}</span>`).join('')}</div>`;
}
function modPending(m){
  return `<div class="mod-pending"><div class="mp-bars"><i></i><i></i><i></i></div>
    <div class="mp-t">数据待补${m.pendingHint?' · '+_esc(m.pendingHint):''}</div></div>`;
}
// timeline 倒数徽章:data 里没写 badge 就按日期自动算(数据不用天天改)
function _countdown(dateStr){
  const d=new Date(dateStr+'T00:00:00'); if(isNaN(d)) return '';
  const days=Math.round((d-new Date().setHours(0,0,0,0))/864e5);
  return days>0?`还有 ${days} 天`:days===0?'今天':`已过 ${-days} 天`;
}

const MOD_RENDER={
  /* ① 数字对比:预期 vs 实际 · 行式 + Beat/Miss 判定 */
  numcompare(d){
    return `<div class="gtable-wrap"><table class="gtable">
      <tr><th></th>${(d.cols||[]).map(c=>`<th>${_esc(c)}</th>`).join('')}<th></th></tr>
      ${(d.rows||[]).map(r=>`<tr><td>${_esc(r.label)}</td>${(r.vals||[]).map(v=>`<td>${_esc(v)}</td>`).join('')}
        <td class="${r.verdict==='beat'?'beat':r.verdict==='miss'?'miss':''}">${r.verdict==='beat'?'✚ Beat':r.verdict==='miss'?'− Miss':''}</td></tr>`).join('')}
    </table></div>`;
  },
  /* ② 观点列表:投行/KOL · 方向+目标价+一句话+出处(up:1 看多绿 / up:-1 看空红 / 不写=中性灰) */
  opinions(d){
    return `<div class="bank-grid">${(d.items||[]).map(b=>`<div class="bank-card">
      <div class="bank-top"><b>${_esc(b.who)}</b><span class="rating ${b.up===1||b.up===true?'up':b.up===-1?'dn':''}">${_esc(b.dir)}${b.tp?' · TP '+_esc(b.tp):''}</span></div>
      <div class="bank-q">“${_esc(b.q)}”</div>
      ${b.src?`<div class="bank-src">${b.src.url?`<a class="mod-src" href="${_esc(b.src.url)}" target="_blank" rel="noopener">${_esc(b.src.label)} ↗</a>`:`<span class="mod-src">${_esc(b.src.label)}</span>`}</div>`:''}
    </div>`).join('')}</div>`;
  },
  /* ③ 时间线 / 事件日历:日期+事件+倒数徽章(badge 缺省自动算) */
  timeline(d){
    return `<div class="tl-list">${(d.events||[]).map(e=>{const badge=e.badge||_countdown(e.date);return `<div class="next-guid">
      <div><b>${_esc(e.date)}${e.label?' · '+_esc(e.label):''}</b>${e.sub?`<div class="ng-sub">${_esc(e.sub)}</div>`:''}</div>
      ${badge?`<span class="ng-count">${_esc(badge)}</span>`:''}</div>`;}).join('')}</div>`;
  },
  /* ④ 迷你图表:kind:'bars' 横条(带正负色) / kind:'spark' inline SVG 折线 · 不引外部库 */
  minichart(d){
    if(d.kind==='spark'){
      const vs=(d.series||[]).map(s=>+s.v);
      if(!vs.length) return '';
      const min=Math.min(...vs),max=Math.max(...vs),W=240,H=48;
      const pts=vs.map((v,i)=>`${((i/(vs.length-1||1))*W).toFixed(1)},${(H-6-((v-min)/((max-min)||1))*(H-12)).toFixed(1)}`).join(' ');
      return `<svg viewBox="0 0 ${W} ${H}" class="sparkline" preserveAspectRatio="none"><polyline points="${pts}"/></svg>
        ${d.note?`<div class="mod-note">${_esc(d.note)}</div>`:''}`;
    }
    const mx=Math.max(...(d.series||[]).map(s=>Math.abs(+s.v)),0.0001);
    return `<div class="bars">${(d.series||[]).map(s=>`<div class="bar-row">
      <span class="bar-l">${_esc(s.label)}</span>
      <span class="bar-track"><i class="${s.v>=0?'up':'dn'}" style="width:${(Math.abs(+s.v)/mx*100).toFixed(1)}%"></i></span>
      <span class="bar-v ${s.v>=0?'beat':'miss'}">${s.v>=0?'+':''}${_esc(s.v)}${_esc(d.unit||'')}</span></div>`).join('')}</div>
      ${d.note?`<div class="mod-note">${_esc(d.note)}</div>`:''}`;
  },
  /* ⑤ 搜索入口:预置外链 chip · 无 url = 待接 dim 态 · {node}/{nid} 占位符自动替换成节点上下文 */
  searchrow(d){
    const fill=u=>u.replace(/\{node\}/g,encodeURIComponent(APP_CTX.node)).replace(/\{nid\}/g,encodeURIComponent(APP_CTX.nid));
    return `<div class="xrow">${(d.chips||[]).map(c=>
      c.url?`<a class="xbtn" href="${_esc(fill(c.url))}" target="_blank" rel="noopener">${_esc(c.label)}</a>`
           :`<span class="xbtn xbtn-dim" title="待接">${_esc(c.label)}</span>`).join('')}</div>`;
  },
  /* ⑥ 原始数据表:通用表格(rows = 数组的数组) */
  rawtable(d){
    return `<div class="gtable-wrap"><table class="gtable">
      <tr>${(d.cols||[]).map(c=>`<th>${_esc(c)}</th>`).join('')}</tr>
      ${(d.rows||[]).map(r=>`<tr>${(r||[]).map(v=>`<td>${_esc(v)}</td>`).join('')}</tr>`).join('')}
    </table></div>`;
  },
};

/* 单模块 = 头(标题 + 示意/待补 tag + asof)+ 体(有数据 or 占位)+ 出处 */
function renderModule(m){
  const tag=m.state==='pending'?'<span class="pend-tag">待补</span>':(m.sim?'<span class="sim-tag">示意</span>':'');
  const asof=m.asof?`<span class="mod-asof">asof ${_esc(m.asof)}</span>`:'';
  const body=m.state==='pending'?modPending(m):((MOD_RENDER[m.type]||(()=>`<div class="app-err">未知模块 type:${_esc(m.type)}</div>`))(m.data||{}));
  const srcs=m.state==='pending'?'':srcChips(m.sources);
  const note=(m.state!=='pending'&&m.note)?`<div class="mod-note">${_esc(m.note)}</div>`:'';
  return `<div class="app-sec" data-mod="${_esc(m.type)}">
    <div class="app-sec-h">${_esc(m.icon||'')} ${_esc(m.title||m.type)} ${tag}${asof}</div>${body}${note}${srcs}</div>`;
}

async function initApp(){
  if(APP_CTX.embed) document.body.classList.add('embed');
  const el=document.getElementById('app-root');
  let D;
  try{
    const r=await fetch('data.json?'+Date.now());
    if(!r.ok) throw new Error('HTTP '+r.status);
    D=await r.json();
  }catch(e){
    el.innerHTML=`<div class="app-err">data.json 载入失败:${_esc(e.message)}<br>这个 app 目录下需要一份 data.json(契约见 site/apps/README.md)</div>`;
    return;
  }
  const meta=D.meta||{}, mods=D.modules||[];
  document.title=meta.title||'节点 App';
  const pendN=mods.filter(m=>m.state==='pending').length;
  // embed(抽屉里):标题行由抽屉头代劳 · 只留 asof/待补统计小行;独立打开:完整头
  const head=APP_CTX.embed?'':`<div class="app-head">
    <span class="app-kind">${_esc(meta.icon||'📱')} ${_esc(meta.kind||'节点 App')}</span>
    <span class="app-title">${_esc(meta.title||'')}</span></div>`;
  const sub=`<div class="app-sub">
    ${APP_CTX.nid?`<span class="app-node-chip">N${_esc(APP_CTX.nid)}</span>`:''}
    ${meta.asof?`<span>数据整理 ${_esc(meta.asof)}</span>`:''}
    ${pendN?`<span class="app-pend-n">◐ ${pendN} 模块待补</span>`:''}</div>`;
  el.innerHTML=head+sub+mods.map(renderModule).join('');
}
initApp();
