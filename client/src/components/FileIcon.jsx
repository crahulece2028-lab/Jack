const KIND = {
  pdf: 'PDF',
  doc: 'DOC',
  docx: 'DOC',
  xls: 'XLS',
  xlsx: 'XLS',
  ppt: 'PPT',
  pptx: 'PPT',
  txt: 'TXT',
  csv: 'CSV',
  zip: 'ZIP',
  mp3: 'MP3',
  mp4: 'MP4',
  md: 'MD',
  svg: 'SVG',
  json: 'JSON',
  html: 'HTML',
};

const KIND_FROM_MIME = {
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.ms-powerpoint': 'ppt',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  'application/zip': 'zip',
  'text/csv': 'csv',
  'text/plain': 'txt',
  'text/markdown': 'md',
  'text/html': 'html',
  'application/json': 'json',
  'audio/mpeg': 'mp3',
  'video/mp4': 'mp4',
};

function kindOf({ type = '', name = '' } = {}) {
  if (KIND_FROM_MIME[type]) return KIND_FROM_MIME[type];
  const m = /\.([a-z0-9]{1,10})$/i.exec(String(name || ''));
  if (m && KIND[m[1].toLowerCase()]) return m[1].toLowerCase();
  return 'file';
}

export default function FileIcon({ type, name }) {
  const kind = kindOf({ type, name });
  return (
    <div className={`file-icon file-icon-${kind}`}>
      <span>{KIND[kind] || 'FILE'}</span>
    </div>
  );
}
