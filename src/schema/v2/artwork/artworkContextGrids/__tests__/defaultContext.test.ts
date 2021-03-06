import gql from "lib/gql"
import { runAuthenticatedQuery } from "schema/v2/test/utils"
import { assign } from "lodash"

describe("Default Context", () => {
  let context: any
  let parentArtwork = {} as any

  const query = gql`
    {
      artwork(id: "donn-delson-space-invader") {
        contextGrids {
          title
          ctaTitle
          ctaHref
          artworksConnection(first: 2) {
            edges {
              node {
                slug
                title
              }
            }
          }
        }
      }
    }
  `

  beforeEach(() => {
    assign(parentArtwork, {
      _id: "abc123",
      id: "parentArtwork",
      title: "the Parent artwork",
      artist: {
        id: "andy-warhol",
        name: "Andy Warhol",
        published_artworks_count: 123,
      },
      partner: {
        id: "cama-gallery",
        name: "CAMA Gallery",
        default_profile_id: "cama-gallery",
      },
    })

    const artistArtworks = [
      { id: "artwork1", title: "Artwork 1" },
      { id: "artwork2", title: "Artwork 2" },
      { id: "artwork3", title: "Artwork 3" },
    ]

    const partnerArtworks = [
      { id: "partnerArtwork1", title: "Partner Artwork 1" },
      { id: "partnerArtwork2", title: "Partner Artwork 2" },
      { id: "partnerArtwork3", title: "Partner Artwork 3" },
    ]

    context = {
      artworkLoader: () => Promise.resolve(parentArtwork),
      artistArtworksLoader: () => Promise.resolve(artistArtworks),
      relatedFairsLoader: () => Promise.resolve(null),
      relatedShowsLoader: () => Promise.resolve(null),
      partnerArtworksLoader: () => {
        return Promise.resolve({
          body: partnerArtworks,
          headers: { "x-total-count": "10" },
        })
      },
      relatedLayerArtworksLoader: () => Promise.resolve(null),
      relatedLayersLoader: () => Promise.resolve([]),
    }
  })

  it("Returns the correct values for metadata fields when there is just artist data", async () => {
    parentArtwork.partner = null
    context.partnerArtworksLoader = Promise.resolve(null)

    await runAuthenticatedQuery(query, context).then(data => {
      // Should have one artist grid and one related grid with 0 works
      expect(data.artwork.contextGrids.length).toEqual(2)
      const {
        title,
        ctaTitle,
        ctaHref,
        artworksConnection,
      } = data.artwork.contextGrids[0]

      expect(title).toEqual("Other works by Andy Warhol")
      expect(ctaTitle).toEqual("View all works by Andy Warhol")
      expect(ctaHref).toEqual("/artist/andy-warhol")
      expect(artworksConnection.edges.length).toEqual(2)

      // Related artworks grid should have no artworks
      expect(data.artwork.contextGrids[1].artworksConnection).toEqual(null)
    })
    expect.assertions(6)
  })

  it("Returns the correct values for metadata fields when there is just partner data", async () => {
    parentArtwork.artist = null
    context.artistArtworksLoader = Promise.resolve(null)

    await runAuthenticatedQuery(query, context).then(data => {
      // Should have one partner grid and one related grid with 0 works
      expect(data.artwork.contextGrids.length).toEqual(2)
      const {
        title,
        ctaTitle,
        ctaHref,
        artworksConnection,
      } = data.artwork.contextGrids[0]

      expect(title).toEqual("Other works from CAMA Gallery")
      expect(ctaTitle).toEqual("View all works from CAMA Gallery")
      expect(ctaHref).toEqual("/cama-gallery")
      expect(artworksConnection.edges.length).toEqual(2)

      // Related artworks grid should have no artworks
      expect(data.artwork.contextGrids[1].artworksConnection).toEqual(null)
    })
    expect.assertions(6)
  })

  it("Returns the correct values for metadata fields when there is all data", async () => {
    context.relatedLayersLoader = () => Promise.resolve([{ id: "main" }])
    context.relatedLayerArtworksLoader = () =>
      Promise.resolve([
        { id: "relatedArtwork1", title: "Related Artwork 1" },
        { id: "relatedArtwork2", title: "Related Artwork 2" },
        { id: "relatedArtwork3", title: "Related Artwork 3" },
      ])

    await runAuthenticatedQuery(query, context).then(data => {
      // Should have one artist grid and one related grid with 0 works
      expect(data.artwork.contextGrids.length).toEqual(3)

      // The first grid should include artist-related metadata
      const {
        title: artistTitle,
        ctaTitle: artistCtaTitle,
        ctaHref: artistctaHref,
        artworksConnection: artistArtworks,
      } = data.artwork.contextGrids[0]

      expect(artistTitle).toEqual("Other works by Andy Warhol")
      expect(artistCtaTitle).toEqual("View all works by Andy Warhol")
      expect(artistctaHref).toEqual("/artist/andy-warhol")
      expect(artistArtworks.edges.map(({ node }) => node.slug)).toEqual([
        "artwork1",
        "artwork2",
      ])

      // The second grid should include partner-related metadata
      const {
        title: partnerTitle,
        ctaTitle: partnerCtaTitle,
        ctaHref: partnerctaHref,
        artworksConnection: partnerArtworks,
      } = data.artwork.contextGrids[1]

      expect(partnerTitle).toEqual("Other works from CAMA Gallery")
      expect(partnerCtaTitle).toEqual("View all works from CAMA Gallery")
      expect(partnerctaHref).toEqual("/cama-gallery")
      expect(partnerArtworks.edges.map(({ node }) => node.slug)).toEqual([
        "partnerArtwork1",
        "partnerArtwork2",
      ])

      // The third grid should include related artworks
      const {
        title: relatedTitle,
        ctaTitle: relatedCtaTitle,
        ctaHref: relatedctaHref,
        artworksConnection: relatedArtworks,
      } = data.artwork.contextGrids[2]

      expect(relatedTitle).toEqual("Related works")
      expect(relatedCtaTitle).toEqual(null)
      expect(relatedctaHref).toEqual(null)
      expect(relatedArtworks.edges.map(({ node }) => node.slug)).toEqual([
        "relatedArtwork1",
        "relatedArtwork2",
      ])
    })
    expect.assertions(13)
  })
})
