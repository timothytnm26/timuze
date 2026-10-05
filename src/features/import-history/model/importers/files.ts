import { strFromU8, unzipSync } from 'fflate'

export interface TextFile {
  name: string
  text: string
}

const base = (name: string) => name.split('/').pop() ?? name

const unzipText = (bytes: Uint8Array, match: (name: string) => boolean, depth: number): TextFile[] => {
  const entries = unzipSync(bytes, { filter: (f) => /\.zip$/i.test(f.name) || match(f.name) })
  const out: TextFile[] = []
  for (const [name, data] of Object.entries(entries)) {
    if (/\.zip$/i.test(name)) {
      // Apple nests its archives (Apple_Media_Services.zip inside the download)
      if (depth < 2) out.push(...unzipText(data, match, depth + 1))
    } else out.push({ name: base(name), text: strFromU8(data) })
  }
  return out
}

/** Reads the text of every file matching `match`, looking inside .zip archives (even nested ones). */
export async function collectTextFiles(files: File[], match: (name: string) => boolean): Promise<TextFile[]> {
  const out: TextFile[] = []
  for (const file of files) {
    if (/\.zip$/i.test(file.name)) {
      out.push(...unzipText(new Uint8Array(await file.arrayBuffer()), match, 0))
    } else if (match(file.name)) {
      out.push({ name: file.name, text: await file.text() })
    }
  }
  return out
}
