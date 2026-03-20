export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function esc(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

export function getMedian(arr) {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : ((sorted[mid - 1] + sorted[mid]) / 2).toFixed(1);
}

export function getMode(arr) {
  const freq = {};
  arr.forEach(v => freq[v] = (freq[v] || 0) + 1);
  const max = Math.max(...Object.values(freq));
  return Object.keys(freq).filter(k => freq[k] === max).join(', ');
}

export function getStdDev(arr) {
  const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
  return Math.sqrt(arr.reduce((s, v) => s + (v - avg) ** 2, 0) / arr.length);
}

export function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export function csvEsc(v) {
  const s = String(v);
  return s.includes(',') || s.includes('"') || s.includes('\n')
    ? '"' + s.replace(/"/g, '""') + '"'
    : s;
}

export function getYoutubeEmbedUrl(url) {
  if (!url) return null;
  let m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/);
  return m ? 'https://www.youtube.com/embed/' + m[1] : null;
}

// Extract embed URL from SharePoint video link or <iframe> embed code
export function getSharePointEmbedUrl(input) {
  if (!input) return null;
  // Case 1: user pasted <iframe ...> embed code → extract src
  const iframeMatch = input.match(/<iframe[^>]+src="([^"]+)"/i);
  if (iframeMatch) return iframeMatch[1];
  // Case 2: embed.aspx URL (already embeddable)
  if (input.includes('sharepoint.com') && input.includes('embed.aspx')) return input;
  // Case 3: SharePoint sharing link (e.g. https://xxx.sharepoint.com/:v:/s/site/EaBcDef...)
  // Append action=embedview to make it embeddable in iframe
  if (input.includes('sharepoint.com') && /\/:v:\//.test(input)) {
    const sep = input.includes('?') ? '&' : '?';
    return input + sep + 'action=embedview';
  }
  return null;
}

// Sanitize video URL input: extract src from <iframe> tags
export function sanitizeVideoUrl(raw) {
  if (!raw) return raw;
  const m = raw.match(/<iframe[^>]+src="([^"]+)"/i);
  return m ? m[1] : raw;
}

export function groupQuestions(qs, groups) {
  if (!groups || !groups.length) return [{ group: null, questions: qs.map((q, i) => ({ q, qi: i })) }];
  const groupMap = {};
  groups.forEach(g => { groupMap[g.id] = g; });
  const result = [];
  qs.forEach((q, qi) => {
    const gid = q.group && groupMap[q.group] ? q.group : null;
    const lastSection = result[result.length - 1];
    const lastGroupId = lastSection ? (lastSection.group ? lastSection.group.id : null) : undefined;
    if (!lastSection || lastGroupId !== gid) {
      result.push({ group: gid ? groupMap[gid] : null, questions: [{ q, qi }] });
    } else {
      lastSection.questions.push({ q, qi });
    }
  });
  return result;
}
