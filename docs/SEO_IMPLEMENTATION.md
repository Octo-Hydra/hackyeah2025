# SEO Implementation Guide

## Overview

OnTime PWA has comprehensive SEO implementation following Next.js 15 best practices. This includes metadata, Open Graph images, structured data, sitemaps, and robots configuration.

## Features Implemented

### ✅ Root Metadata (`src/app/layout.tsx`)
- **Title Template**: `%s | OnTime` for consistent branding
- **Description**: Comprehensive Polish description with keywords
- **Keywords**: Extensive list of Polish transport-related terms
- **Open Graph**: Full OG tags with images (1200x630)
- **Twitter Cards**: Large image cards configured
- **Icons**: Multiple sizes for all platforms (16x16, 32x32, 180x180, 192x192, 512x512)
- **Apple Web App**: iOS-specific metadata with splash screens
- **Robots**: Proper indexing directives for search engines

### ✅ Dynamic OG Images
- **File**: `src/app/opengraph-image.tsx`
- **Size**: 1200x630px (optimal for social sharing)
- **Technology**: Next.js ImageResponse with edge runtime
- **Design**: Blue gradient with OnTime branding
- **Twitter**: Separate `twitter-image.tsx` (identical design)

### ✅ Robots.txt (`src/app/robots.ts`)
- Allows public pages: `/`, `/auth/signin`, `/auth/signup`
- Disallows private pages: `/api/*`, `/user`, `/alerts`, `/moderator`, auth flows
- Includes sitemap reference
- Googlebot-specific rules with crawl delay

### ✅ Sitemap (`src/app/sitemap.ts`)
- Dynamic sitemap with `changeFrequency` and `priority`
- Homepage: `always` frequency, 1.0 priority
- Auth pages: `monthly` frequency, 0.8 priority
- Uses `NEXT_PUBLIC_APP_URL` for absolute URLs

### ✅ PWA Manifest (`src/app/manifest.ts`)
- **SEO-enhanced fields**: Extended description, proper categorization
- **Categories**: travel, utilities, navigation, productivity
- **Language**: `lang: "pl"`, `dir: "ltr"`
- **Screenshots**: Mobile screenshot with descriptive label
- **Icons**: Multiple sizes with `purpose: "any"` and `purpose: "maskable"`

### ✅ Structured Data (JSON-LD)
- **File**: `src/components/json-ld.tsx`
- **Schema.org**: WebApplication type
- **Features**: Rating (4.8/5), free pricing, feature list
- **Usage**: Injected in root layout via `<JsonLd />` component

### ✅ Page-Specific Metadata
All major pages have custom metadata:

#### Public Pages
- **Alerts** (`/alerts`): Metadata with canonical URL
- **Auth Signin** (`/auth/signin`): Login-specific metadata
- **Auth Forgot Password**: Password reset metadata

#### Private Pages (noindex)
- **User Profile** (`/user`): `robots: { index: false }`
- **Moderator Panel** (`/moderator`): `robots: { index: false }`
- **Email Verification**: `robots: { index: false }`
- **Reset Password**: `robots: { index: false }`

### ✅ Canonical URLs
- All pages include `alternates.canonical` for proper URL canonicalization
- Helper function in `src/lib/seo.ts` for consistent URL generation

## Environment Variables

Add to `.env`:
```bash
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

This is used for:
- `metadataBase` in root layout
- Sitemap URLs
- Robots.txt host
- Open Graph image URLs
- Canonical URLs

## File Structure

```
src/
  app/
    layout.tsx                      # Root metadata + JSON-LD
    opengraph-image.tsx             # OG image generator
    twitter-image.tsx               # Twitter card image
    robots.ts                       # Robots.txt config
    sitemap.ts                      # XML sitemap
    manifest.ts                     # PWA manifest (SEO-enhanced)
    
    auth/
      layout.tsx                    # Auth group metadata
      signin/layout.tsx             # Signin-specific metadata
      forgot-password/layout.tsx    # Forgot password metadata
      reset-password/layout.tsx     # Reset password metadata
      verify-email/layout.tsx       # Email verification metadata
    
    alerts/page.tsx                 # Alerts metadata
    user/page.tsx                   # User profile metadata (noindex)
    moderator/page.tsx              # Moderator metadata (noindex)
  
  components/
    json-ld.tsx                     # Structured data component
  
  lib/
    seo.ts                          # SEO helper functions
```

## Testing

### Local Testing
1. **Metadata**: View page source, check `<head>` tags
2. **OG Images**: Visit `http://localhost:3000/opengraph-image`
3. **Robots**: Visit `http://localhost:3000/robots.txt`
4. **Sitemap**: Visit `http://localhost:3000/sitemap.xml`
5. **Manifest**: Visit `http://localhost:3000/manifest.json`

### Production Testing Tools
- **Google Rich Results**: https://search.google.com/test/rich-results
- **Twitter Card Validator**: https://cards-dev.twitter.com/validator
- **Facebook Debugger**: https://developers.facebook.com/tools/debug/
- **Lighthouse SEO Audit**: Chrome DevTools → Lighthouse → SEO

### Structured Data Validation
- Visit: https://validator.schema.org/
- Paste your URL or JSON-LD content
- Verify WebApplication schema

## Best Practices Applied

✅ **Mobile-First**: All metadata optimized for mobile PWA
✅ **Polish Language**: All text in Polish (`lang="pl"`, `locale="pl_PL"`)
✅ **Privacy-Aware**: Private pages marked with `noindex`
✅ **Performance**: Edge runtime for OG image generation
✅ **Accessibility**: Alt text on all images
✅ **Social Sharing**: Optimized OG and Twitter cards
✅ **Search Engines**: Proper robots.txt and sitemap.xml
✅ **Progressive Web App**: PWA manifest with SEO fields

## Next Steps (Optional Enhancements)

1. **Multi-language Support**: Add English translations
2. **Blog/Articles**: Create content pages for SEO
3. **FAQ Schema**: Add FAQ structured data
4. **BreadcrumbList**: Add breadcrumb navigation schema
5. **LocalBusiness**: If applicable, add local business schema
6. **Dynamic OG Images**: Per-page custom OG images
7. **Google Analytics**: Add GA4 tracking
8. **Search Console**: Submit sitemap to Google Search Console

## Troubleshooting

### Issue: OG images not showing
- **Solution**: Ensure `NEXT_PUBLIC_APP_URL` is set correctly
- **Check**: Visit `/opengraph-image` directly in browser

### Issue: Robots.txt not found
- **Solution**: `robots.ts` must be in `src/app/` directory
- **Check**: Next.js build logs for robots.txt generation

### Issue: Sitemap not updating
- **Solution**: Sitemap is generated at build time
- **Check**: Run `npm run build` to regenerate

### Issue: Metadata not appearing
- **Solution**: Check if page is "use client" (needs layout.tsx)
- **Check**: View page source to verify `<meta>` tags

## Performance Considerations

- **OG Images**: Generated on-demand, cached by Next.js
- **Edge Runtime**: OG images use edge runtime for fast generation
- **Static Files**: robots.txt and sitemap.xml are statically generated
- **No External Dependencies**: All SEO features use Next.js built-ins

## Compliance

- ✅ **WCAG 2.1**: Alt text on all images
- ✅ **Schema.org**: Valid structured data
- ✅ **Open Graph Protocol**: Compliant OG tags
- ✅ **Twitter Cards**: Valid card metadata
- ✅ **PWA Standards**: Manifest meets PWA requirements

---

**Last Updated**: October 4, 2025
**Version**: 1.0.0
**Maintained by**: Hydra Tech
