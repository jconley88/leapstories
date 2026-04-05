# Hacker News DOM Reference

Research conducted 2026-04-04 via live `curl` fetches of `news.ycombinator.com/news?p=1` and `?p=2`.

## Page structure

The entire page HTML is served on a **single line** (no newlines between elements).

```
<html lang="en" op="news">
  <body>
    <center>
      <table id="hnmain">          <!-- outer wrapper, 85% width, bgcolor #f6f6ef -->
        <tr>...</tr>                <!-- orange header bar -->
        <tr style='height:10px'/>   <!-- spacer -->
        <tr id="bigbox">
          <td>
            <table>                 <!-- STORY TABLE (unnamed, no class/id) -->
              ...story rows...
              <tr class="morespace" style="height:10px"></tr>
              <tr>
                <td colspan="2"></td>
                <td class='title'>
                  <a href='?p=2' class='morelink' rel='next'>More</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </center>
  </body>
</html>
```

## Story row structure

Each story consists of **3 consecutive `<tr>` rows** in the story table:

### 1. Main row (`athing submission`)

```html
<tr class="athing submission" id="47637757">
  <td align="right" valign="top" class="title">
    <span class="rank">1.</span>
  </td>
  <td valign="top" class="votelinks">
    <center>
      <a id='up_47637757' href='vote?id=47637757&amp;how=up&amp;goto=news%3Fp%3D1'>
        <div class='votearrow' title='upvote'></div>
      </a>
    </center>
  </td>
  <td class="title">
    <span class="titleline">
      <a href="https://arxiv.org/abs/2604.01193">Simple self-distillation improves code generation</a>
      <span class="sitebit comhead"> (<a href="from?site=arxiv.org"><span class="sitestr">arxiv.org</span></a>)</span>
    </span>
  </td>
</tr>
```

Notes:
- Class is `"athing submission"` (two classes), not just `"athing"`
- The `id` attribute is the numeric HN story ID
- Rank is in `<span class="rank">` with trailing period (e.g., `1.`)
- Two `<td class="title">` cells exist: one for rank, one for the actual title link

### 2. Subtext row

```html
<tr>
  <td colspan="2"></td>
  <td class="subtext">
    <span class="subline">
      <span class="score" id="score_47637757">320 points</span>
       by <a href="user?id=Anon84" class="hnuser">Anon84</a>
       <span class="age" title="2026-04-04T10:26:21 1775298381">
         <a href="item?id=47637757">6 hours ago</a>
       </span>
       <span id="unv_47637757"></span>
       | <a href="hide?id=47637757&amp;goto=news%3Fp%3D1">hide</a>
       | <a href="item?id=47637757">95&nbsp;comments</a>
    </span>
  </td>
</tr>
```

Notes:
- No class on this `<tr>` — it's identified by position (immediately after the `athing` row)
- Score element: `<span class="score" id="score_<storyId>">`
- Comment link points to `item?id=<storyId>`

### 3. Spacer row

```html
<tr class="spacer" style="height:5px"></tr>
```

A simple empty row for visual spacing between stories.

## Pagination

- 30 stories per page
- Page 1 ranks: 1-30, page 2 ranks: 31-60, etc.
- Page number via query param: `?p=N` (default is 1)
- "More" link at bottom: `<a href='?p=2' class='morelink' rel='next'>More</a>`
- The `morespace` row (`<tr class="morespace" style="height:10px">`) separates the last story from the "More" link
- The bare URL `/` and `/news` both serve the same top stories listing

## Key selectors for LeapStories

| Target | Selector |
|--------|----------|
| Story table | `#bigbox td > table` |
| All story rows | `tr.athing.submission` |
| Story ID | `tr.athing.submission` `.id` attribute |
| Rank number | `tr.athing.submission .rank` |
| First story | `tr.athing.submission:first-of-type` (or first match in querySelectorAll) |
| Subtext row | next sibling `<tr>` after an `athing` row |
| Spacer row | `tr.spacer` (next sibling after subtext) |
| More link | `a.morelink` |

## Story row relationships

Given a story `<tr class="athing submission">`, the related rows are:
- **Subtext**: `storyRow.nextElementSibling`
- **Spacer**: `storyRow.nextElementSibling.nextElementSibling`

All three must be copied together when injecting a story into a different page.

## URL patterns

| URL | Content |
|-----|---------|
| `/` or `/news` | Top stories (what LeapStories targets) |
| `/news?p=N` | Top stories, page N |
| `/newest` | New stories (not targeted in v1) |
| `/front` | Front page stories (not targeted in v1) |
| `/ask`, `/show` | Ask/Show HN (not targeted in v1) |
| `/item?id=N` | Individual story/comment page |
| `/user?id=X` | User profile |

## HN API

Hacker News has a public Firebase API at `hacker-news.firebaseio.com` — no authentication required. However, it's item-by-item (no "give me page N" endpoint). To get a page equivalent, you'd need to:

1. `GET /v0/topstories.json` — returns ranked array of all story IDs
2. Slice to the desired page range (e.g., IDs 0-29 for page 1)
3. Fetch each item individually: `GET /v0/item/<id>.json`

This means 30+ HTTP requests per page vs. a single HTML fetch. For v1, fetching and parsing the HTML page is simpler and more efficient.
