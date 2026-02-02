/**
 * SEO entry point: /srt-translator
 * Reuses the same tool as /translate-subtitles. Do NOT duplicate upload, polling, or API logic here.
 */
import TranslateSubtitles from '../TranslateSubtitles'

const FAQ = [
  {
    q: 'What is an SRT translator?',
    a: 'It translates the text in your SRT (or VTT) subtitle file to another language while keeping timestamps unchanged. Upload your file and pick the target language.',
  },
  {
    q: 'Which languages are supported?',
    a: 'Arabic and Hindi are available; more languages may be added. The original timing is preserved so subtitles stay in sync.',
  },
  {
    q: 'Can I edit the translated subtitles?',
    a: 'Yes. After translation you can preview and download. Paid plans allow in-app editing of the translated text before download.',
  },
]

export default function SrtTranslatorPage() {
  return (
    <TranslateSubtitles
      seoH1="SRT Translator Online"
      seoIntro="Translate SRT subtitle files to another language. Upload your SRT or VTT, choose the target language, and download translated captions with timestamps intact."
      faq={FAQ}
    />
  )
}
