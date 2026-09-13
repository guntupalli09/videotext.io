/**
 * Internal verification locators for retained statistics.
 * Point a human reviewer to the exact place in the original source.
 * Do not render these as long quotations on the public hub.
 */
export const SOURCE_LOCATORS: Record<
  string,
  { sourceLocator: string; verificationNote?: string }
> = {
  'who-430m-disabling': {
    sourceLocator: 'Overview, first paragraph after Key facts (live WHO fact sheet, 3 March 2026 update)',
    verificationNote: 'Confirmed on who.int/news-room/fact-sheets/detail/deafness-and-hearing-loss: “Over 5% of the world’s population – or 430 million people – require rehabilitation to address their disabling hearing loss.”',
  },
  'who-34m-children-disabling': {
    sourceLocator: 'Overview, first paragraph (parenthetical child count on the same 430 million sentence)',
  },
  'who-2050-25b': {
    sourceLocator: 'Key facts, first bullet (live WHO fact sheet, 3 March 2026 update)',
  },
  'who-2050-700m': {
    sourceLocator: 'Key facts, first bullet (same sentence as the 2.5 billion projection) and Overview paragraph 1',
  },
  'who-951m-children-5-19': {
    sourceLocator: 'Key facts, second bullet (live WHO fact sheet, 3 March 2026 update)',
  },
  'who-1-trillion-cost': {
    sourceLocator: 'Key facts, third bullet (live WHO fact sheet, 3 March 2026 update)',
  },
  'who-1b-young-adults-risk': {
    sourceLocator: 'Key facts, fourth bullet (live WHO fact sheet, 3 March 2026 update)',
  },
  'nidcd-15pct-us-adults': {
    sourceLocator: 'Quick Statistics About Hearing page, Hearing list, “Approximately 15% of American adults (37.5 million)” bullet',
  },
  'nidcd-2-3-per-1000-births': {
    sourceLocator: 'Quick Statistics About Hearing page, Hearing list, first bullet (2 to 3 out of every 1,000 children)',
  },
  'nidcd-90pct-deaf-children-hearing-parents': {
    sourceLocator: 'Quick Statistics About Hearing page, Hearing list, second bullet',
  },
  'nidcd-1-in-8-bilateral': {
    sourceLocator: 'Quick Statistics About Hearing page, Hearing list, “1 in 8 people in the United States (13%, or 30 million)” bullet',
  },
  'nidcd-disabling-by-age': {
    sourceLocator: 'Quick Statistics About Hearing page, Hearing list, disabling-hearing-loss-by-age bullets (45–54 / 55–64 / 65–74 / 75+)',
  },
  'nidcd-288m-benefit-aids': {
    sourceLocator: 'Quick Statistics About Hearing page, Hearing list, “About 28.8 million U.S. adults could benefit from using hearing aids” bullet',
  },
  'nidcd-hearing-aid-uptake': {
    sourceLocator: 'Quick Statistics About Hearing page, Hearing list, ages-70+ “fewer than 1 in 3 (30%)” and ages-20–69 “approximately 16%” bullets',
  },
  'nidcd-men-twice-women': {
    sourceLocator: 'Quick Statistics About Hearing page, Hearing list, “Men are almost twice as likely as women” bullet (ages 20–69)',
  },
  'nidcd-prevalence-drop-20-69': {
    sourceLocator: 'Quick Statistics About Hearing page, Hearing list, 16% (28.0 million) 1999–2004 vs 14% (27.7 million) 2011–2012 bullet',
  },
  'nidcd-1m-cochlear': {
    sourceLocator: 'Quick Statistics About Hearing page, Hearing list, “As of July 2022, more than 1 million cochlear implants” bullet',
  },
  'cdc-13pct-2019': {
    sourceLocator: 'NCHS Data Brief 414, Key findings, first bullet (13.0% some difficulty hearing)',
    verificationNote: 'Live cdc.gov/nchs/products/databriefs/db414.htm returned HTTP 403 in this audit. The same official URL was confirmed via the Internet Archive capture (13.0% of adults). Official CDC URL is retained as sourceUrl.',
  },
  'cdc-16pct-severe-2019': {
    sourceLocator: 'NCHS Data Brief 414, Key findings, first bullet (1.6% a lot of difficulty or could not hear at all)',
    verificationNote: 'Confirmed on the archived official CDC Data Brief 414 page. Live CDC HTML returned HTTP 403 in this audit.',
  },
  'cdc-hearing-by-age-2019': {
    sourceLocator: 'NCHS Data Brief 414, Results / Figure 1 discussion (6.3% ages 18–44, 13.6% 45–64, 26.8% 65+)',
    verificationNote: 'sourceUrl is the official 508 tables PDF companion. The same age rates appear in the archived HTML brief.',
  },
  'cdc-65plus-severe-2019': {
    sourceLocator: 'NCHS Data Brief 414, Key findings, age bullet (4.1% of adults 65+ in the most severe category)',
    verificationNote: 'Confirmed on the archived official CDC Data Brief 414 page. Live CDC HTML returned HTTP 403 in this audit.',
  },
  'cdc-71pct-hearing-aid-45plus': {
    sourceLocator: 'NCHS Data Brief 414, Results / Figure 4 discussion (7.1% of adults 45+; 8.9% men / 5.4% women)',
    verificationNote: 'Confirmed on the archived official CDC Data Brief 414 page. Live CDC HTML returned HTTP 403 in this audit.',
  },
  '3play-90pct-caption-some': {
    sourceLocator: '2024 State of Captioning PDF, Closed captioning chapter, page 15 (“90% of respondents are captioning at least some of their content”)',
  },
  '3play-338pct-caption-all': {
    sourceLocator: '2024 State of Captioning PDF, page 15 volume bars (None / A little / Some / Most / All: 35.6% most, 33.8% all)',
  },
  '3play-35pct-500-hours': {
    sourceLocator: '2024 State of Captioning PDF, page 16 (“35% of respondents are producing 500+ hours of video content annually”)',
  },
  '3play-39pct-caption-everything': {
    sourceLocator: '2024 State of Captioning PDF, page 16 prioritization sentence (“39% report that they simply caption everything”)',
  },
  '3play-606pct-access-motivator': {
    sourceLocator: '2024 State of Captioning PDF, page 17 primary-motivator chart (“Accessibility, equal access 60.6%”)',
  },
  '3play-30pct-budget-barrier': {
    sourceLocator: '2024 State of Captioning PDF, page 18 (“30% of organizations report that budget is the biggest hurdle”; “resources/time (26%)”)',
  },
  '3play-66pct-accuracy-standards': {
    sourceLocator: '2024 State of Captioning PDF, page 12 (“66% of organizations have standards for captioning accuracy”; “Do not have captioning standards 34%”)',
  },
  '3play-49pct-policies': {
    sourceLocator: '2024 State of Captioning PDF, page 11 (“49% have clear policies for accessibility compliance”; “41% have centralized procedures and processes”)',
  },
  '3play-81pct-social': {
    sourceLocator: '2024 State of Captioning PDF, page 21 (“81% are captioning at least some social media content”)',
  },
  '3play-14pct-auto-accessible': {
    sourceLocator: '2024 State of Captioning PDF, page 29 (“only 14% of respondents believe they provide an accessible experience”)',
  },
  '3play-273pct-auto-then-edit': {
    sourceLocator: '2024 State of Captioning PDF, page 29 workflow mix (“We start auto, then edit 27.3%”; “Do not use auto at all 23.5%”)',
  },
  '3play-539pct-audio-description': {
    sourceLocator: '2024 State of Captioning PDF, page 32 (“53.9% of respondents reporting they use AD at least sometimes”; “Yes, all the time 18.4%”)',
  },
  '3play-526pct-youtube': {
    sourceLocator: '2024 State of Captioning PDF, page 19 (“52.6% of respondents point to YouTube as their platform of choice” / Video platforms bar)',
  },
  '3play-48pct-budget-up': {
    sourceLocator: '2024 State of Captioning PDF, page 7 Media accessibility habits (“Almost half of respondents reported budget increases. 28% increased moderately. 20% increased significantly.”)',
    verificationNote: 'The report states past increases, not planned future increases.',
  },
  '3play-408pct-hybrid-vendors': {
    sourceLocator: '2024 State of Captioning PDF, page 8 (“Mix of in-house work + vendors 40.8%”; declined 15% since last year)',
  },
  '3play-616pct-subtitling': {
    sourceLocator: '2024 State of Captioning PDF, page 36 localization-method bars (Subtitling 61.6%; non-English captions 40.4%; live translation 27.3%; dubbing 25.3%)',
  },
  '3play-60pct-localize': {
    sourceLocator: '2024 State of Captioning PDF, page 35 (“22% localize all the time”; “38% localize sometimes”)',
    verificationNote: '60% is the sum of the two exclusive printed bars on page 35 (22% + 38%). The report also describes a 17% increase in localizing at least some content.',
  },
  '3play-78pct-live': {
    sourceLocator: '2024 State of Captioning PDF, page 24 (“78% are streaming live video content”)',
  },
  '3play-live-caption-mix': {
    sourceLocator: '2024 State of Captioning PDF, page 26 (“33% live caption all the time”; “46% live caption sometimes”)',
  },
  '3play-55pct-live-auto-errors': {
    sourceLocator: '2024 State of Captioning PDF, page 25 (“Among those who use them, 55% report inaccuracy and errors as their biggest challenge”)',
  },
  'fcc-100pct-new-programming': {
    sourceLocator: '47 CFR § 79.1, new-programming captioning quota: “100% of new, nonexempt English language and Spanish language video programming” (Cornell LII / eCFR text)',
  },
  'fcc-75pct-prerule': {
    sourceLocator: '47 CFR § 79.1, pre-rule programming quota: “75% of pre-rule, nonexempt English language and Spanish language video programming” (Cornell LII / eCFR text)',
  },
  'pew-youtube-85-2024': {
    sourceLocator: 'Pew short-read “5 facts about Americans and YouTube” (28 Feb 2025), first numbered fact (“As of 2024, 85% of adults say they ever use YouTube”)',
  },
  'pew-youtube-84-2025': {
    sourceLocator: 'Pew Social Media Fact Sheet, adult-use table, 6/18/2025 YouTube row (84%) and methodology note (5,022 U.S. adults, 5 Feb–18 June 2025 NPORS)',
    verificationNote: 'Age breakouts 95 / 92 / 85 / 64 appear in the same fact sheet’s YouTube-by-age table (Ages 18–29 / 30–49 / 50–64 / 65+).',
  },
  'pew-teens-youtube-90': {
    sourceLocator: 'Pew “Teens, Social Media and Technology 2024” report, “YouTube tops the list” paragraph (“Nine-in-ten teens… down slightly from 95% in 2022”)',
  },
  'pew-teens-youtube-daily-73': {
    sourceLocator: 'Pew “Teens, Social Media and Technology 2024” report, daily-use paragraph (“73% of teens say they go on YouTube daily… 15% almost constantly”)',
  },
  'pew-facebook-70-2024': {
    sourceLocator: 'Pew Social Media Fact Sheet adult-use table, 6/10/2024 Facebook cell (70%), also restated in the 28 Feb 2025 YouTube short-read',
  },
  'pew-instagram-50-2024': {
    sourceLocator: 'Pew Social Media Fact Sheet adult-use table, 6/10/2024 Instagram cell (50%), also restated in the 28 Feb 2025 YouTube short-read',
  },
  'edison-51pct-ever-watched': {
    sourceLocator: 'The Podcast Consumer 2025 PDF, “Video podcast adoption is significant” slide (“51% … has ever consumed a video podcast”)',
    verificationNote: 'Confirmed in the SSRS-hosted Infinite Dial / Podcast Consumer 2025 PDF. The Edison HTML hub returned HTTP 403 in this audit.',
  },
  'edison-73pct-210m': {
    sourceLocator: 'The Podcast Consumer 2025 PDF, “Podcast consumption at record high” slide (73% ever consumed) and following estimated-population slide (210 million)',
    verificationNote: 'Confirmed in https://ssrs.com/wp-content/uploads/The-Podcast-Consumer-2025.pdf. Edison HTML hub returned HTTP 403 in this audit.',
  },
  'edison-55pct-monthly-158m': {
    sourceLocator: 'The Podcast Consumer 2025 PDF, record-high slide (55% last month) and estimated-population slide (158 million monthly consumers)',
    verificationNote: 'Confirmed in the SSRS-hosted PDF. Edison HTML hub returned HTTP 403 in this audit.',
  },
  'edison-40pct-weekly-115m': {
    sourceLocator: 'The Podcast Consumer 2025 PDF, record-high slide (40% last week) and estimated-population slide (115 million weekly consumers)',
    verificationNote: 'Confirmed in the SSRS-hosted PDF.',
  },
  'edison-773m-hours': {
    sourceLocator: 'The Podcast Consumer 2025 PDF, “Weekly Time Spent With Podcasts” / Share of Ear slide (170 million hours 2015 vs 773 million hours 2025; 355% increase)',
  },
  'edison-video-podcast-monthly-37': {
    sourceLocator: 'The Podcast Consumer 2025 PDF, “Video podcast adoption is significant” slide (37% monthly / 26% weekly video-podcast consumers, U.S. 12+)',
  },
  'whisper-680k-hours': {
    sourceLocator: 'Radford et al. arXiv:2212.04356 abstract (“680,000 hours of multilingual and multitask supervision”)',
  },
  'whisper-table2-clean-27': {
    sourceLocator: 'Whisper paper PDF, Table 2, LibriSpeech Clean row (wav2vec 2.7 / Whisper Large V2 2.7 / 0.0% relative reduction)',
  },
  'whisper-table2-other-52': {
    sourceLocator: 'Whisper paper PDF, Table 2, LibriSpeech Other row (6.2 vs 5.2)',
  },
  'whisper-chime6-255': {
    sourceLocator: 'Whisper paper PDF, Table 2, CHiME-6 row (65.8 vs 25.5; 61.2% relative error reduction)',
  },
  'whisper-common-voice-90': {
    sourceLocator: 'Whisper paper PDF, Table 2, Common Voice row (29.9 vs 9.0)',
  },
  'whisper-ami-ihm-169': {
    sourceLocator: 'Whisper paper PDF, Table 2, AMI IHM row (16.9) and AMI SDM1 row (36.4)',
  },
  'whisper-callhome-176': {
    sourceLocator: 'Whisper paper PDF, Table 2, CallHome row (17.6) and Switchboard row (13.8)',
  },
  'whisper-tedlium-40': {
    sourceLocator: 'Whisper paper PDF, Table 2, TED-LIUM row (10.5 vs 4.0)',
  },
  'whisper-average-128-rer': {
    sourceLocator: 'Whisper paper PDF, Table 2 Average row (29.3 vs 12.8; 55.2% average relative error reduction)',
  },
  'whisper-tiny-67': {
    sourceLocator: 'Whisper paper PDF, Table 1 Tiny parameter count (39M) and nearby prose (“39 million parameters and a 6.7 WER on LibriSpeech test-clean”)',
  },
  'librispeech-1000-hours': {
    sourceLocator: 'OpenSLR 12 “About this resource” paragraph (“approximately 1000 hours of 16kHz read English speech”)',
  },
  'common-voice-20-hours': {
    sourceLocator: 'Mozilla Foundation blog “Common Voice 20 is Now Available,” hours paragraph (33,150 hours; 22,108 validated; 133 scripted-speech languages)',
  },
  'nces-75m-idea': {
    sourceLocator: 'NCES Condition of Education, Students With Disabilities indicator, 2022–23 IDEA enrollment sentence (7.5 million; 15 percent of public-school students)',
  },
  'nces-hearing-impairment-09': {
    sourceLocator: 'NCES Digest of Education Statistics Table 204.50 (2022–23), Hearing impairment row (69,595 students; 0.9%)',
  },
  'nces-hearing-impairment-grad-84': {
    sourceLocator: 'NCES Condition of Education, Students With Disabilities, regular-diploma exit comparison (“highest for students with hearing impairments (84 percent)”)',
  },
  'ndc-enrollment-gap': {
    sourceLocator: 'National Deaf Center NPSAS / undergraduate-enrollment brief, national-data sentence (4.9% of deaf adults vs 10.0% of hearing people; Bloom, Palmer & Winninghoff 2023)',
  },
  'ndc-college-employment-87': {
    sourceLocator: 'National Deaf Center “College Matters” news summary, Key Findings (87% of college graduates employed vs 68% of high-school graduates)',
  },
  'webaim-1539-responses': {
    sourceLocator: 'WebAIM Screen Reader User Survey #10 results page, opening paragraph (“We received 1539 valid responses”)',
  },
  'webaim-jaws-405': {
    sourceLocator: 'WebAIM Survey #10 results, “Primary desktop/laptop screen reader” table (JAWS 40.5%; NVDA 37.7%; VoiceOver 9.7%)',
  },
  'webaim-mobile-913': {
    sourceLocator: 'WebAIM blog “Screen Reader User Survey #10 Results,” mobile findings (91.3% mobile; VoiceOver 70.6%)',
  },
  'webaim-headings-716': {
    sourceLocator: 'WebAIM blog Survey #10 write-up, heading-navigation sentence (71.6% most common method of exploring page content)',
    verificationNote: 'The results-page 71.6% figure in a later table is “use more than one desktop/laptop screen reader.” This retained claim uses the blog’s heading-navigation 71.6%.',
  },
  'webaim-a11y-improved-346': {
    sourceLocator: 'WebAIM Survey #10 results, web-accessibility-change table (“Web content has become more accessible 522 / 34.6%”) and blog comparison to 39.3% in 2021',
  },
}
