const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #F0F2F5; }
  .app { font-family: 'Montserrat', sans-serif; background: #F0F2F5; min-height: 100vh; color: #1a1a2e; padding: 20px; }
  .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; flex-wrap: wrap; gap: 10px; }
  .header-left { display: flex; align-items: center; gap: 14px; }
  .header-logo { width: 40px; height: 40px; background: #1877F2; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .header-logo span { color: #fff; font-weight: 700; font-size: 18px; }
  .header-title { font-size: 20px; font-weight: 700; color: #1a1a2e; }
  .header-sub { font-size: 11px; color: #888; font-weight: 500; margin-top: 2px; }
  .header-right { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .user-chip { display: flex; align-items: center; gap: 8px; background: #fff; border-radius: 20px; padding: 6px 14px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
  .user-dot { width: 8px; height: 8px; border-radius: 50%; background: #1877F2; }
  .user-name { font-size: 12px; font-weight: 700; color: #1a1a2e; }
  .user-change { font-size: 11px; color: #aaa; cursor: pointer; text-decoration: underline; margin-left: 4px; }
  .user-change:hover { color: #1877F2; }
  .sync-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; margin-right: 6px; }
  .sync-dot.online { background: #1DB954; }
  .sync-dot.offline { background: #E8335A; }
  .sync-dot.syncing { background: #E8970C; animation: pulse 1s infinite; }
  @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
  .sync-label { font-size: 11px; color: #888; font-weight: 600; }
  .btn-danger { padding: 7px 12px; background: #fff; border: 1px solid #E8335A; border-radius: 8px; font-size: 12px; font-family: 'Montserrat', sans-serif; color: #E8335A; cursor: pointer; font-weight: 600; transition: all 0.15s; white-space: nowrap; }
  .btn-danger:hover { background: #E8335A; color: #fff; }
  .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 100; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px); }
  .modal { background: #fff; border-radius: 20px; padding: 40px; width: 380px; box-shadow: 0 20px 60px rgba(0,0,0,0.2); text-align: center; }
  .modal-logo { width: 52px; height: 52px; background: #1877F2; border-radius: 14px; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; }
  .modal-logo span { color: #fff; font-weight: 700; font-size: 22px; }
  .modal-logo.danger { background: #E8335A; }
  .modal-title { font-size: 18px; font-weight: 700; color: #1a1a2e; margin-bottom: 6px; }
  .modal-sub { font-size: 13px; color: #888; margin-bottom: 24px; line-height: 1.5; }
  .modal-input { width: 100%; padding: 12px 16px; border: 2px solid #e0e0e0; border-radius: 10px; font-size: 14px; font-family: 'Montserrat', sans-serif; color: #1a1a2e; outline: none; transition: border-color 0.15s; text-align: center; }
  .modal-input:focus { border-color: #1877F2; }
  .modal-input.error { border-color: #E8335A; background: #FFF5F7; }
  .modal-btn { width: 100%; margin-top: 14px; padding: 12px; background: #1877F2; color: #fff; border: none; border-radius: 10px; font-size: 14px; font-weight: 700; font-family: 'Montserrat', sans-serif; cursor: pointer; transition: background 0.2s; }
  .modal-btn:hover { background: #1560c0; }
  .modal-btn:disabled { background: #ccc; cursor: not-allowed; }
  .modal-btn.danger { background: #E8335A; }
  .modal-btn.danger:hover { background: #c0192f; }
  .modal-btn-cancel { width: 100%; margin-top: 8px; padding: 10px; background: transparent; color: #888; border: 1px solid #e0e0e0; border-radius: 10px; font-size: 13px; font-weight: 600; font-family: 'Montserrat', sans-serif; cursor: pointer; }
  .modal-btn-cancel:hover { border-color: #aaa; color: #555; }
  .modal-error-msg { font-size: 12px; color: #E8335A; font-weight: 600; margin-top: 8px; }
  .tabs { display: flex; gap: 4px; margin-bottom: 20px; background: #fff; border-radius: 12px; padding: 4px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); width: fit-content; }
  .tab-btn { padding: 8px 20px; border-radius: 9px; border: none; cursor: pointer; font-size: 13px; font-weight: 600; font-family: 'Montserrat', sans-serif; background: transparent; color: #888; transition: all 0.15s; }
  .tab-btn.active { background: #1877F2; color: #fff; box-shadow: 0 2px 8px rgba(24,119,242,0.3); }
  .tab-btn:hover:not(.active) { background: #f0f4ff; color: #1877F2; }
  .upload-area { border: 2px dashed #d0d5dd; border-radius: 16px; padding: 64px 40px; text-align: center; background: #fff; max-width: 480px; margin: 60px auto; }
  .upload-title { font-size: 18px; font-weight: 700; color: #1a1a2e; margin-bottom: 8px; }
  .upload-desc { font-size: 13px; color: #888; margin-bottom: 24px; }
  .btn-upload { display: inline-block; background: #1877F2; color: #fff; padding: 11px 28px; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 13px; font-family: 'Montserrat', sans-serif; transition: background 0.2s; }
  .btn-upload:hover { background: #1560c0; }
  .toast { position: fixed; bottom: 28px; left: 50%; transform: translateX(-50%); color: #fff; padding: 12px 24px; border-radius: 10px; font-size: 13px; font-weight: 600; z-index: 999; box-shadow: 0 4px 16px rgba(0,0,0,0.2); animation: fadeup 0.3s ease; white-space: nowrap; }
  @keyframes fadeup { from { opacity: 0; transform: translateX(-50%) translateY(10px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
  .toast.green { background: #1DB954; }
  .toast.blue { background: #1877F2; }
  .toast.red { background: #E8335A; }
  .main-layout { display: block; }
  .main-content { width: 100%; position: relative; }
  .table-overlay { position: absolute; inset: 0; background: rgba(240,242,245,0.75); z-index: 10; border-radius: 14px; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(3px); }
  .table-overlay-msg { background: #fff; border-radius: 14px; padding: 24px 32px; text-align: center; box-shadow: 0 8px 32px rgba(0,0,0,0.14); border-top: 4px solid #E8335A; max-width: 300px; }
  .table-overlay-icon { font-size: 28px; margin-bottom: 10px; }
  .table-overlay-title { font-size: 14px; font-weight: 700; color: #1a1a2e; margin-bottom: 6px; }
  .table-overlay-sub { font-size: 12px; color: #888; line-height: 1.5; }
  .side-panel { position: fixed; top: 20px; right: 20px; width: 300px; max-height: calc(100vh - 40px); background: #fff; border-radius: 14px; box-shadow: 0 8px 40px rgba(0,0,0,0.18); overflow: hidden; z-index: 30; animation: slideIn 0.18s ease; }
  .panel-backdrop { position: fixed; inset: 0; z-index: 29; background: rgba(0,0,0,0.12); backdrop-filter: blur(1px); }
  @keyframes slideIn { from { opacity: 0; transform: translateX(16px); } to { opacity: 1; transform: translateX(0); } }
  .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 14px; }
  @media (max-width: 1100px) { .stats-grid { grid-template-columns: repeat(2, 1fr); } }
  .stat-card { background: #fff; border-radius: 14px; padding: 18px 20px; border-top: 4px solid #eee; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
  .stat-card.pending { border-top-color: #1877F2; }
  .stat-card.overdue { border-top-color: #E8335A; }
  .stat-card.paid { border-top-color: #1DB954; }
  .stat-card.partial { border-top-color: #E8970C; }
  .stat-label { font-size: 10px; color: #888; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; }
  .stat-value { font-size: 22px; font-weight: 700; line-height: 1; }
  .stat-card.pending .stat-value { color: #1877F2; }
  .stat-card.overdue .stat-value { color: #E8335A; }
  .stat-card.paid .stat-value { color: #1DB954; }
  .stat-card.partial .stat-value { color: #E8970C; }
  .stat-sub { font-size: 11px; color: #aaa; margin-top: 4px; }
  .alerta-venc { background: #fff; border-radius: 14px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); margin-bottom: 14px; overflow: hidden; border-left: 4px solid #E8970C; }
  .alerta-venc-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 18px; cursor: pointer; user-select: none; }
  .alerta-venc-title { font-size: 12px; font-weight: 700; color: #1a1a2e; display: flex; align-items: center; gap: 10px; }
  .alerta-venc-badge { background: #E8970C; color: #fff; font-size: 11px; font-weight: 700; padding: 2px 10px; border-radius: 20px; }
  .alerta-venc-badge.rojo { background: #E8335A; }
  .alerta-venc-toggle { font-size: 11px; color: #aaa; font-weight: 600; }
  .alerta-venc-body { padding: 0 18px 14px; display: flex; flex-wrap: wrap; gap: 8px; }
  .alerta-chip { display: flex; align-items: center; gap: 8px; padding: 6px 12px; border-radius: 10px; font-size: 12px; cursor: pointer; transition: opacity 0.15s; border: 1px solid transparent; }
  .alerta-chip:hover { opacity: 0.8; }
  .alerta-chip.hoy { background: #FFF5F7; border-color: #ffd0d8; }
  .alerta-chip.manana { background: #FFF5EC; border-color: #fdc99a; }
  .alerta-chip.semana { background: #FFFBF0; border-color: #fde68a; }
  .alerta-chip-dias { font-weight: 700; font-size: 11px; padding: 1px 7px; border-radius: 8px; }
  .alerta-chip.hoy .alerta-chip-dias { background: #E8335A; color: #fff; }
  .alerta-chip.manana .alerta-chip-dias { background: #f97316; color: #fff; }
  .alerta-chip.semana .alerta-chip-dias { background: #E8970C; color: #fff; }
  .alerta-chip-nombre { font-weight: 600; color: #1a1a2e; max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .alerta-chip-importe { font-weight: 700; color: #888; font-size: 11px; }
  .toolbar { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin-bottom: 14px; }
  .filter-group { display: flex; gap: 6px; flex-wrap: wrap; }
  .filter-btn { padding: 7px 14px; border-radius: 20px; border: none; cursor: pointer; font-size: 12px; font-weight: 600; font-family: 'Montserrat', sans-serif; background: #fff; color: #555; transition: all 0.15s; box-shadow: 0 1px 3px rgba(0,0,0,0.08); white-space: nowrap; }
  .filter-btn.active { background: #1877F2; color: #fff; box-shadow: none; }
  .filter-btn:hover:not(.active) { background: #e8edf5; }
  .filter-btn.selection-mode { background: #1a1a2e; color: #fff; box-shadow: none; }
  .filter-btn.selection-mode:hover { background: #333; }
  .comis-select { padding: 7px 28px 7px 12px; border-radius: 20px; border: 1px solid #e0e0e0; cursor: pointer; font-size: 12px; font-weight: 600; font-family: 'Montserrat', sans-serif; background: #fff; color: #555; outline: none; transition: all 0.15s; box-shadow: 0 1px 3px rgba(0,0,0,0.08); appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 12 12'%3E%3Cpath fill='%23888' d='M6 8L1 3h10z'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 10px center; }
  .comis-select.active { border-color: #1877F2; color: #1877F2; background-color: #EBF3FF; }
  .search-input { flex: 1; min-width: 160px; padding: 8px 14px; background: #fff; border: 1px solid #e0e0e0; border-radius: 8px; font-size: 13px; font-family: 'Montserrat', sans-serif; color: #1a1a2e; outline: none; transition: border-color 0.15s; }
  .search-input:focus { border-color: #1877F2; }
  .btn-change { padding: 7px 12px; background: #fff; border: 1px solid #e0e0e0; border-radius: 8px; font-size: 12px; font-family: 'Montserrat', sans-serif; color: #666; cursor: pointer; font-weight: 600; transition: all 0.15s; white-space: nowrap; }
  .btn-change:hover { border-color: #1877F2; color: #1877F2; }
  .bulk-panel { background: #1a1a2e; border-radius: 14px; padding: 18px 20px; margin-bottom: 14px; display: flex; align-items: flex-start; gap: 16px; flex-wrap: wrap; }
  .bulk-panel-title { font-size: 12px; font-weight: 700; color: #fff; }
  .bulk-count { background: #1877F2; color: #fff; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 20px; margin-left: 8px; }
  .bulk-field { flex: 1; min-width: 140px; }
  .bulk-label { font-size: 10px; font-weight: 700; color: #aaa; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; }
  .bulk-select { width: 100%; padding: 8px 10px; border-radius: 8px; border: none; font-size: 13px; font-family: 'Montserrat', sans-serif; color: #1a1a2e; outline: none; background: #fff; cursor: pointer; }
  .bulk-input { width: 100%; padding: 8px 10px; border-radius: 8px; border: none; font-size: 13px; font-family: 'Montserrat', sans-serif; color: #1a1a2e; outline: none; background: #fff; }
  .bulk-input.required-empty { border-bottom: 2px solid #E8335A; }
  .bulk-input.required-ok { border-bottom: 2px solid #1DB954; }
  .bulk-textarea { width: 100%; padding: 8px 10px; border-radius: 8px; border: none; font-size: 13px; font-family: 'Montserrat', sans-serif; color: #1a1a2e; outline: none; background: #fff; resize: vertical; min-height: 56px; }
  .bulk-actions { display: flex; flex-direction: column; gap: 8px; justify-content: flex-end; padding-top: 20px; }
  .bulk-apply { padding: 10px 20px; background: #1DB954; color: #fff; border: none; border-radius: 8px; font-size: 13px; font-weight: 700; font-family: 'Montserrat', sans-serif; cursor: pointer; white-space: nowrap; transition: background 0.15s; }
  .bulk-apply:hover { background: #17a349; }
  .bulk-apply:disabled { background: #555; cursor: not-allowed; }
  .bulk-cancel { padding: 9px 20px; background: transparent; color: #aaa; border: 1px solid #444; border-radius: 8px; font-size: 12px; font-weight: 600; font-family: 'Montserrat', sans-serif; cursor: pointer; white-space: nowrap; }
  .bulk-cancel:hover { border-color: #888; color: #fff; }
  .bulk-required-msg { font-size: 11px; color: #E8335A; font-weight: 600; margin-top: 4px; }
  .table-wrapper { background: #fff; border-radius: 14px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
  .table-meta { padding: 12px 18px; border-bottom: 1px solid #f0f0f0; font-size: 12px; color: #aaa; font-weight: 500; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 6px; }
  .table-scroll { overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; font-size: 14px; table-layout: auto; }
  thead tr { background: #F8F9FA; }
  th { padding: 10px 14px; text-align: left; font-size: 11px; font-weight: 600; color: #555; border-bottom: 1px solid #eee; white-space: nowrap; text-transform: uppercase; letter-spacing: 0.5px; }
  th.right { text-align: right; }
  th.col-cliente { min-width: 200px; }
  th.col-vence   { width: 100px; }
  th.col-comp    { width: 110px; }
  th.col-estado  { width: 190px; }
  th.col-metodo  { width: 140px; }
  th.col-importe { width: 120px; }
  th.col-editor  { width: 130px; }
  th.col-check   { width: 40px; }
  tbody tr { border-bottom: 1px solid #f5f5f5; transition: background 0.1s; cursor: pointer; }
  tbody tr.row-selected { background: #EBF3FF !important; outline: 2px solid #1877F2; outline-offset: -2px; }
  tbody tr.row-checked { background: #f0f4ff !important; }
  tbody tr.row-paid { background: #F6FFF9; }
  tbody tr.row-overdue { background: #FFF5F7; }
  tbody tr.row-today { background: #FFFBF0; }
  tbody tr:hover { background: #f0f4ff !important; }
  td { padding: 10px 14px; vertical-align: middle; }
  td.nowrap { white-space: nowrap; }
  td.right { text-align: right; white-space: nowrap; }
  td.col-cliente { white-space: normal; word-break: break-word; min-width: 200px; }
  .cb { width: 16px; height: 16px; accent-color: #1877F2; cursor: pointer; }
  .estado-badge { display: inline-block; padding: 3px 10px; border-radius: 10px; font-size: 11px; font-weight: 700; white-space: nowrap; }
  .excluido-badge { display: inline-block; padding: 2px 7px; border-radius: 8px; font-size: 10px; font-weight: 600; background: #f0f0f0; color: #999; margin-left: 6px; white-space: nowrap; }
  .metodo-badge { display: inline-block; padding: 3px 10px; border-radius: 10px; font-size: 11px; font-weight: 600; background: #EBF3FF; color: #1877F2; white-space: nowrap; }
  .editor-name { font-size: 11px; font-weight: 700; color: #555; }
  .editor-time { font-size: 10px; color: #bbb; margin-top: 1px; }
  .date-paid { color: #ccc; font-weight: 500; }
  .date-overdue { color: #E8335A; font-weight: 700; }
  .date-today { color: #E8970C; font-weight: 600; }
  .date-normal { color: #444; font-weight: 500; }
  .badge-vencido { display: inline-block; margin-left: 6px; font-size: 9px; padding: 2px 6px; border-radius: 8px; font-weight: 700; background: #E8335A; color: #fff; }
  .badge-hoy { display: inline-block; margin-left: 6px; font-size: 9px; padding: 2px 6px; border-radius: 8px; font-weight: 700; background: #E8970C; color: #fff; }
  .client-name { font-weight: 600; color: #1a1a2e; line-height: 1.4; }
  .client-name.paid { color: #ccc; }
  .client-sub { font-size: 11px; color: #aaa; margin-top: 2px; font-weight: 400; }
  .comp-text { color: #888; font-size: 12px; display: block; max-width: 110px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .amount-text { font-weight: 700; font-size: 14px; color: #1a1a2e; }
  .amount-paid { font-weight: 700; font-size: 14px; color: #1DB954; }
  .empty-cell { padding: 48px; text-align: center; color: #bbb; font-size: 14px; }
  .panel-header { padding: 16px 18px; border-bottom: 1px solid #f0f0f0; display: flex; align-items: center; justify-content: space-between; background: #F8F9FA; }
  .panel-title { font-size: 12px; font-weight: 700; color: #1a1a2e; text-transform: uppercase; letter-spacing: 0.5px; }
  .panel-close { background: none; border: none; cursor: pointer; color: #aaa; font-size: 20px; line-height: 1; padding: 0; font-family: inherit; }
  .panel-close:hover { color: #E8335A; }
  .panel-close.blocked { cursor: not-allowed; opacity: 0.3; }
  .panel-body { padding: 20px; overflow-y: auto; max-height: calc(100vh - 120px); }
  .panel-client { font-size: 14px; font-weight: 700; color: #1a1a2e; margin-bottom: 2px; line-height: 1.3; }
  .panel-meta { font-size: 11px; color: #888; margin-bottom: 12px; }
  .panel-amount { font-size: 26px; font-weight: 700; color: #1877F2; margin-bottom: 2px; }
  .panel-vence { font-size: 12px; color: #888; margin-bottom: 14px; }
  .panel-divider { height: 1px; background: #f0f0f0; margin: 14px 0; }
  .panel-field { margin-bottom: 14px; }
  .panel-field-label { font-size: 10px; font-weight: 700; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; display: flex; align-items: center; gap: 6px; }
  .required-star { color: #E8335A; font-size: 10px; font-weight: 700; background: #FFF0F0; padding: 1px 6px; border-radius: 4px; }
  .panel-select { width: 100%; padding: 9px 30px 9px 12px; border: 1px solid #e0e0e0; border-radius: 8px; font-size: 13px; font-family: 'Montserrat', sans-serif; color: #1a1a2e; outline: none; background: #fff; cursor: pointer; transition: border-color 0.15s; appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23888' d='M6 8L1 3h10z'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 10px center; }
  .panel-select:focus { border-color: #1877F2; }
  .panel-select.required-error { border-color: #E8335A; background-color: #FFF5F7; }
  .required-msg { font-size: 11px; color: #E8335A; font-weight: 600; margin-top: 6px; padding: 6px 10px; background: #FFF5F7; border-radius: 6px; border-left: 3px solid #E8335A; }
  .panel-input { width: 100%; padding: 9px 12px; border: 1px solid #e0e0e0; border-radius: 8px; font-size: 13px; font-family: 'Montserrat', sans-serif; color: #1a1a2e; outline: none; transition: border-color 0.15s; }
  .panel-input:focus { border-color: #1877F2; }
  .panel-input.required-error { border-color: #E8335A; background: #FFF5F7; }
  .panel-textarea { width: 100%; padding: 9px 12px; border: 1px solid #e0e0e0; border-radius: 8px; font-size: 13px; font-family: 'Montserrat', sans-serif; color: #1a1a2e; outline: none; resize: vertical; min-height: 72px; transition: border-color 0.15s; }
  .panel-textarea:focus { border-color: #1877F2; }
  .panel-empty { padding: 48px 20px; text-align: center; }
  .panel-empty-icon { font-size: 28px; margin-bottom: 10px; }
  .panel-hint { font-size: 11px; color: #bbb; margin-top: 4px; line-height: 1.5; }
  .estado-preview { display: inline-block; padding: 4px 12px; border-radius: 10px; font-size: 11px; font-weight: 700; margin-bottom: 14px; }
  .saldo-box { margin-top: 8px; padding: 10px 12px; background: #FFF5F7; border-radius: 8px; border: 1px solid #ffd0d8; }
  .saldo-box-label { font-size: 10px; color: #888; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 3px; }
  .saldo-box-value { font-size: 18px; font-weight: 700; color: #E8335A; }
  .cobrado-box { margin-top: 8px; padding: 10px 12px; background: #F6FFF9; border-radius: 8px; border: 1px solid #b8f0cc; }
  .cobrado-box-label { font-size: 10px; color: #888; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 3px; }
  .cobrado-box-value { font-size: 18px; font-weight: 700; color: #1DB954; }
  .analisis-card { background: #fff; border-radius: 14px; padding: 20px 24px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); border-top: 4px solid #eee; }
  .analisis-card.delay { border-top-color: #E8970C; }
  .analisis-card.termino { border-top-color: #1DB954; }
  .analisis-card.tarde { border-top-color: #E8335A; }
  .analisis-label { font-size: 10px; color: #888; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; }
  .analisis-value { font-size: 30px; font-weight: 700; line-height: 1; }
  .analisis-card.delay .analisis-value { color: #E8970C; }
  .analisis-card.termino .analisis-value { color: #1DB954; }
  .analisis-card.tarde .analisis-value { color: #E8335A; }
  .analisis-sub { font-size: 11px; color: #aaa; margin-top: 6px; }
  .analisis-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 20px; }
  @media (max-width: 1000px) { .analisis-row { grid-template-columns: 1fr; } }
  .analisis-panel { background: #fff; border-radius: 14px; padding: 20px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
  .analisis-panel-title { font-size: 12px; font-weight: 700; color: #1a1a2e; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 16px; }
  .metodo-bar-row { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
  .metodo-bar-label { font-size: 12px; font-weight: 600; color: #444; width: 130px; flex-shrink: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .metodo-bar-track { flex: 1; background: #f0f0f0; border-radius: 4px; height: 8px; }
  .metodo-bar-fill { height: 8px; border-radius: 4px; background: #1877F2; transition: width 0.4s ease; }
  .metodo-bar-pct { font-size: 11px; font-weight: 700; color: #888; width: 36px; text-align: right; }
  .ranking-table { width: 100%; border-collapse: collapse; font-size: 13px; }
  .ranking-table th { font-size: 10px; font-weight: 700; color: #888; text-transform: uppercase; letter-spacing: 0.5px; padding: 6px 10px; border-bottom: 1px solid #f0f0f0; text-align: left; }
  .ranking-table th.right { text-align: right; }
  .ranking-table td { padding: 9px 10px; border-bottom: 1px solid #f8f8f8; vertical-align: middle; }
  .ranking-table td.right { text-align: right; }
  .ranking-table tbody tr:last-child td { border-bottom: none; }
  .ranking-num { font-size: 11px; font-weight: 700; color: #ccc; width: 20px; }
  .ranking-name { font-weight: 600; color: #1a1a2e; }
  .delay-chip { display: inline-block; padding: 2px 10px; border-radius: 10px; font-size: 11px; font-weight: 700; }
  .delay-ok { background: #F0FFF6; color: #1DB954; }
  .delay-warn { background: #FFFBF0; color: #E8970C; }
  .delay-bad { background: #FFF5F7; color: #E8335A; }
  .no-data { text-align: center; padding: 48px; color: #bbb; font-size: 13px; }
  .sin-info-vencido { background: #FFF5F7; color: #E8335A; }
  .sin-info-ok { background: #f0f0f0; color: #888; }
`;

export default styles;
