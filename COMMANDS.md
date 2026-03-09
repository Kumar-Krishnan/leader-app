# Commands Quick Reference

## Local Dev Server
```
npx expo start --clear
```

## Build for Netlify
```
npx expo export --platform web && cp public/_redirects dist/_redirects
```

This does two things:
1. `npx expo export --platform web` - builds the `dist/` folder
2. `cp public/_redirects dist/_redirects` - copies the redirects file so client-side routing works (no 404s)

## Run Tests
```
npx jest
npx jest --watch
npx jest --coverage
```
