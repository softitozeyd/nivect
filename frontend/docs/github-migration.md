# Paylaşılan GitHub deposuna sonraki geçiş

Bu demo hiçbir GitHub hesabı veya repository gerektirmeden geliştirilmiştir. GitHub'a otomatik yayın yapılmadı. Yerel proje lockfile ile tekrar kurulabilir.

Takım repository oluşturduğunda: bu klasörün kaynaklarını monorepo içindeki `frontend/` dizinine aktarın. node_modules, dist, test-results, playwright-report ve .env dosyalarını taşımayın; config.example ve package-lock.json dahil olsun. Mevcut takım dosyalarının üstüne yazmayın. `frontend/visionqc-mvp` gibi ayrı feature branch kullanın.

```sh
git switch -c frontend/visionqc-mvp
# Bu projenin takip edilen kaynaklarını frontend/ altına aktarın.
cd frontend
npm ci
npm run typecheck
npm run lint
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Takım erişimi sağlandığında normal git commit/push ve PR akışını kullanın. Review kapsamına demo etiketi, gerçek API sözleşmesi, gizli bilgi kontrolü ve test raporu dahil olsun. Yeni takım projesinde kök .gitignore/CI kurallarına uyun. Kimlik bilgileri paylaşmayın. Backend ekibi gerçek OpenAPI verdiğinde önerilen adaptörü güncelleyin. Bu adımlar gelecekteki takım entegrasyonu içindir; mevcut demoyu kullanmak için gerekli değildir.
