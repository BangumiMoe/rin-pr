
const should = require("should")
const intelligent = require('./../lib/intelligent')

const { predictTitle, calcSimilarity, calcSimilarityByFiles } = intelligent

/* history torrent title */
const HISTORY_TORRENT_TITLE = '【KNA字幕組】【請問您今天要來點兔子嗎 第2季 Is the order a rabbit S2】[04][1920x1080][MP4][繁體]'
/* history torrent files */
const HISTORY_TORRENT_FILES = [['[KNA][Is_the_order_a_rabbit_S2][04][1920x1080][x264_Hi10P_AAC][BIG5].mp4', '50 MB']]
/* new torrent title */
const NEW_TORRENT_TITLE = '【KNA字幕組】【請問您今天要來點兔子嗎 第2季 Is the order a rabbit S2】[05][1920x1080][MP4][繁體]'
/* new torrent files */
const NEW_TORRENT_FILES = [['[KNA][Is_the_order_a_rabbit_S2][05][1920x1080][x264_Hi10P_AAC][BIG5].mp4', '50 MB']]

describe("intelligent", function () {
  it("predict title should success", function () {
    const new_title = predictTitle(
      HISTORY_TORRENT_TITLE,
      HISTORY_TORRENT_FILES,
      NEW_TORRENT_FILES,
      { direct_common: true })
    new_title.should.eql(NEW_TORRENT_TITLE)
  })
  it("title similarity should over 0.9", function () {
    should(calcSimilarity(HISTORY_TORRENT_TITLE, NEW_TORRENT_TITLE)).above(0.9)
  })
  it("files similarity should over 0.9", function () {
    should(calcSimilarityByFiles(HISTORY_TORRENT_FILES, NEW_TORRENT_FILES)).above(0.9)
  })
  it("different title similarity should less than 0.1", function () {
    should(calcSimilarity(HISTORY_TORRENT_TITLE, 'rin-pr unit test')).below(0.1)
  })
  it("different files similarity less than 0.1", function () {
    should(calcSimilarityByFiles(HISTORY_TORRENT_FILES, [['rin-pr unit test', '10 MB']])).below(0.1)
  })
})
