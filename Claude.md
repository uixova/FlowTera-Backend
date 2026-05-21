Seninle bir senkronizasyon protokolü başlatıyoruz:

1. ÖNCE: Belirlediğimiz '/home/kair3nx/Belgeler/NeuralBrain/Projects/Flowtera' dizinindeki ilgili backend modellerini/yapılarını 'read' komutuyla analiz et.
2. SONRA: '/home/kair3nx/Masaüstü/FlowTera-Frontend/' dizinindeki ilgili frontend dosyasını 'read' komutuyla oku.
3. KARŞILAŞTIR: Backend'deki yapı ile frontend'deki yapının uyumlu olup olmadığını kontrol et.
4. UYGULA: Eğer uyuşmazlık varsa veya yeni bir özellik ekliyorsan, backend'deki yapıya (source of truth) uygun şekilde frontend kodunu güncelle.

Bu protokole her zaman sadık kal. Herhangi bir kod yazmadan önce bu süreci izlediğini teyit et.

# Dosya Erişimi ve Filtreleme
- İşlem yaparken `.gitignore` dosyalarını mutlaka dikkate al.
- `node_modules`, `.git`, `.next`, `dist`, `build`, `venv`, `__pycache__` gibi dizinleri asla okuma ve bu dizinlerdeki dosyaları referans alma.
- Sadece kaynak kod dosyalarına (.ts, .tsx, .js, .py, .md) odaklan.

# Dokümantasyon Protokolü
1. Kod tabanında kritik bir değişiklik (veri yapısı, API endpoint, mimari değişiklik) yapıldığında, bunu mutlaka ilgili Obsidian notuna (NeuralBrain dizinindeki notlar) işle.
2. Değişikliği yaptıktan sonra notu güncellemek için 'write' komutunu kullan.
3. Notu güncellemeden önce değişikliğin özetini kısaca bana sun ve "Notu güncelliyorum" diyerek onay al.
4. Okumuş olduğun kodları ve yapıları özet halinde '/home/kair3nx/Belgeler/NeuralBrain/Projects/Flowtera' dizinindeki Backend klasöründe geçici .md dosyası oluşturup içerisine not al ve sonraki dosya bakma işlemlerinde önce oluşturmuş olduğun geçici özet dosyasına bak aradığın yok ise okumaya devam et

## Komut
1. Okumuş olduğun dosyaları ve kodları geçici bir dosyada tut ve asla okumuş olduğun kodları ve dosyaları yenilenmedikçe tekrar tekrar okuma sadece ilgili dosyaları oku!!!!!!