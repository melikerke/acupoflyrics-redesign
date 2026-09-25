import fs from "node:fs";
import { searchTrackBundle } from "../server/spotify.js";
import { preparePublishRecord, writePublishData } from "../server/ingest.js";

function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    if (!fs.existsSync(file)) continue;
    for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
      const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (!match || process.env[match[1]]) continue;
      process.env[match[1]] = match[2].trim().replace(/^["']|["']$/g, "");
    }
  }
}

function parseSections(text) {
  const sections = [];
  let current = null;
  for (const rawLine of text.trim().split("\n")) {
    const line = rawLine.trim();
    const heading = line.match(/^\[(.+)]$/);
    if (heading) {
      current = { section: heading[1], lines: [] };
      sections.push(current);
    } else if (line && current) {
      current.lines.push(line);
    }
  }
  return sections;
}

function align(original, translation, annotations) {
  const originals = parseSections(original);
  const translations = parseSections(translation);
  if (originals.length !== translations.length) {
    throw new Error(`Bölüm sayıları eşleşmiyor: ${originals.length}/${translations.length}`);
  }
  return originals.map((section, index) => ({
    section: section.section,
    original: section.lines,
    translation: translations[index].lines,
    notes: index === 0
      ? Object.entries(annotations).map(([word, text]) => ({ word, text }))
      : [],
  }));
}

const songs = [
  {
    song: "Patient Zero",
    original: `[Chorus]
If you wanna party with somebody who might know
About the devil on his shoulder under his halo
When the toxins take their hold, you'd rather die than let it go
But if you’re sick of him, I got you, I was patient zero

[Verse 1]
I've gotta be honest, I've been expecting your call
No, it’s not a bad time at all
I heard somebody saying there's trouble in paradise
And my lips are sealed tight now

[Pre-Chorus]
It's not for me to tell
Someone else what to do

[Chorus]
But if you wanna party with somebody who might know
About the devil on his shoulder under his halo
When the toxins take their hold, you'd rather die than let it go
But if you're sick of him, I got you, I was patient zero

[Verse 2]
I bet he burst into your life like fireworks
I bet he even said "I love you" first
And when you saw another woman coming out of his place
I bet he kissed the rain off your face

[Pre-Chorus]
Now he seems bored by you
And you don't know what to do

[Chorus]
But if you wanna party with somebody who might know
About the devil on his shoulder under his halo
When the toxins take their hold, you'd rather die than let it go
But if you're sick of him, I got you, I was patient zero (I was patient)
I was patient zero

[Bridge]
So let’s get into it
I know he charmed your family and friends
And you thought it’s 'cause he loves you
But it’s 'cause he loves how everybody else loves him (Uh-huh)
I know it seems like he shines so bright
But he's bathing in your reflected light
On a free solo social climb (Uh-huh)
Take it from somebody who lost his games but won the race
Take it from someone who said all of this to his face
Someone who knows she's more than just the chase
Someone who had him and walked away
And so

[Chorus]
If you wanna party with somebody who might know
About the devil on his shoulder under his halo
And when the toxins take their hold, you’d rather die than let it go
But if you're sick of him, I got you, I was patient zero

[Outro]
So if you wanna kick it, then I'm with it, I've been there
Felt the reeling, done the healing, said the curses and prayers
When the fever turns a dreamer into a pathetic ghost
If he's killing you, I see you, I was patient zero`,
    translation: `[Chorus]
Eğer bunu yaşamış biriyle takılmak istersen
Halesinin altında, omzundaki şeytanı bilen biriyle
O zehir içine işlediğinde, bırakmaktansa ölmeyi yeğlersin
Ama ondan bıktıysan ben buradayım, çünkü ben ilk vakaydım

[Verse 1]
Dürüst olmam gerekirse, aramanı bekliyordum
Hayır, hiç de kötü bir zamana denk gelmedin
Duyduğuma göre cennette işler pek yolunda değilmiş
Ama merak etme, ağzımdan tek kelime çıkmaz

[Pre-Chorus]
Bana düşmez
Bir başkasına ne yapması gerektiğini söylemek

[Chorus]
Ama bunu yaşamış biriyle takılmak istersen
Halesinin altında, omzundaki şeytanı bilen biriyle
O zehir içine işlediğinde, bırakmaktansa ölmeyi yeğlersin
Ama ondan bıktıysan ben buradayım, çünkü ben ilk vakaydım

[Verse 2]
Bahse girerim, hayatına havai fişek gibi pat diye girdi
Bahse girerim, “Seni seviyorum” diyen de ilk oydu
Sonra onun evinden başka bir kadının çıktığını gördüğünde
Bahse girerim, yüzündeki yağmuru öperek sildi

[Pre-Chorus]
Şimdiyse senden sıkılmış gibi
Ve sen ne yapacağını bilmiyorsun

[Chorus]
Ama bunu yaşamış biriyle takılmak istersen
Halesinin altında, omzundaki şeytanı bilen biriyle
O zehir içine işlediğinde, bırakmaktansa ölmeyi yeğlersin
Ama ondan bıktıysan ben buradayım, çünkü ben ilk vakaydım
(İlk vakaydım)
Ben ilk vakaydım

[Bridge]
Hadi, açık konuşalım
Biliyorum, aileni ve arkadaşlarını çoktan büyüledi
Sen de bunu seni sevdiği için yaptığını sandın
Ama aslında herkesin ona hayran olmasını seviyor
(Uh-huh)
Biliyorum, sana ışıl ışıl parlıyor gibi geliyor
Ama o sadece senin ışığınla parlıyor
Halatsız bir sosyal tırmanışta yukarı çıkmaya çalışıyor
(Uh-huh)
Bunu, onun oyunlarında kaybedip sonunda yarışı kazanan birinden dinle
Bunu, bütün bunları onun yüzüne karşı söylemiş birinden dinle
Bir kadının sadece peşinden koşulacak bir hedef olmadığını bilen birinden
Onunla birlikte olup sonra çekip gidebilmiş birinden
Yani—

[Chorus]
Eğer bunu yaşamış biriyle takılmak istersen
Halesinin altında, omzundaki şeytanı bilen biriyle
O zehir içine işlediğinde, bırakmaktansa ölmeyi yeğlersin
Ama ondan bıktıysan ben buradayım, çünkü ben ilk vakaydım

[Outro]
Yani biraz kafa dağıtmak istersen ben varım, ben de oradan geçtim
Başımın nasıl döndüğünü de bilirim, iyileşmenin nasıl bir şey olduğunu da; bedduaları da ettim, duaları da
O ateş bir hayalperesti acınası bir hayalete çevirdiğinde
Eğer o seni içten içe tüketiyorsa seni anlıyorum, çünkü ben ilk vakaydım`,
    annotations: {
      "ilk vaka": "Bir salgında ilk fark edilen veya başlangıç noktası olarak anılan vaka için kullanılan ifade. Şarkıda mecaz olarak, anlatıcının bu kişinin toksik davranışlarını daha önce yaşamış ve ondan çıkmış kişi olduğunu anlatıyor.",
      "Halesinin altında, omzundaki şeytan": "Dışarıdan masum, iyi veya “melek gibi” görünen birinin içinde başka, karanlık bir taraf olması metaforu.",
      "cennette işler pek yolunda değil": "Dışarıdan kusursuz görünen bir ilişkide aslında ciddi sorunlar yaşanması anlamına gelen bir deyim.",
      "zehir": "Burada gerçek bir zehir değil; toksik ilişkinin ve karşı tarafın davranışlarının kişiyi yavaş yavaş içine çekmesi.",
      "Halatsız bir sosyal tırmanış": "“Free solo”, halat veya güvenlik ekipmanı olmadan yapılan kaya tırmanışı. “Social climb” ise sosyal statü yükseltmeye çalışmak. Burada ikisi birleştirilerek, karşı tarafın insanları kullanarak tehlikeli biçimde yükselmeye çalıştığı anlatılıyor.",
      "oyunlarında kaybedip sonunda yarışı kazanan": "Anlatıcı onun manipülatif oyunlarında incinmiş olsa da, sonunda o ilişkiden çıkıp kendi hayatında kazanan taraf olduğunu söylüyor.",
      "peşinden koşulacak bir hedef": "Romantik ilişkide birini elde etmeye çalışmak, peşinden koşmak anlamında. Anlatıcı, kadının sadece “elde edilecek bir hedef” olmadığını vurguluyor.",
      "takılmak": "Burada “tekmelemek” değil; birlikte takılmak, kafa dağıtmak, vakit geçirmek anlamında argo bir ifade.",
      "Başımın nasıl döndüğünü": "Duygusal olarak sersemlemek, başı dönmüş gibi olmak, ne olduğunu anlayamamak hissi.",
      "seni anlıyorum": "Gerçek anlamda öldürmekten çok, bir ilişkinin kişiyi içten içe tüketmesi. “Seni anlıyorum” ifadesi bu dayanışma tonunu Türkçede daha doğal veriyor."
    }
  },
  {
    song: "Cleveland!",
    original: `[Verse 1]
She's not as hot as she was, but she was only a four
She was never a girls' girl, she was just a—
And with all of that money, why's she dressed like trash?
When she smiles, it's annoying, and have you seen her

[Pre-Chorus]
Stumbling clumsily?
Would you even call that dancing?
I can see what you mean
And now I guess there's

[Chorus]
Somethin' we all can agree on
But my baby likes what he likes, oh-woah, oh-oh
He already took me to Cleveland
And showed me The Heights, so hate all you like
This is the love of my life, hey, hey, hey

[Verse 2]
The taste of me is acquired, but it's his favorite dish
He says I look like an angel, they say, "I hate that bi—"
There, that house with the porch is where he lived as a kid
He's been saying forever, must not have read that

[Pre-Chorus]
Scathin' take 'bout how I'm fake
And he could find someone younger
I can see what they mean
And now I guess there's

[Chorus]
Somethin' we all can agree on
But my baby likes what he likes, oh-woah, oh-oh
He already took me to Cleveland
And he showed me The Heights (Hey), so hate all you like (Uh-huh)
This is the love of my life, hey, hey, hey

[Bridge]
He likes what he likes, what he likes and he likes me
He likes what he likes, what he likes and he likes me
You only need to find one person in this entire world (He likes what he likes, what he likes and he likes me)
Who doesn't find you completely insufferable (He likes what he likes, what he likes and)
And I have an important announcement to make
I found mine (That's right)
Well, I found mine (Hey, hey, hey)
Yeah, I found mine
Yes, that's

[Chorus]
Somethin' we all can agree on (I guess we agree, but)
But my baby likes what he likes, oh-woah, oh-oh
He already took me to Cleveland (To Cleveland)
Now I'm wearin' white (Yeah), so hate all you like (Uh-huh)
This is the love of my life (Hey, hey, hey)`,
    translation: `[Verse 1]
Eskisi kadar güzel değilmiş, zaten en fazla dört edermiş
Hiçbir zaman kız kıza dayanışan biri değildi, o sadece bir—
O kadar parası var, neden hâlâ bu kadar kötü giyiniyor?
Gülümsemesi bile sinir bozucu, bir de hiç gördün mü onun—

[Pre-Chorus]
Beceriksizce sendeleyişini?
Sen buna gerçekten dans mı diyorsun?
Ne demek istediğinizi anlıyorum
Ve sanırım şimdi—

[Chorus]
Hepimizin kabul edebileceği bir şey var
Ama sevgilim neyi seviyorsa onu seviyor, oh-woah, oh-oh
Beni çoktan Cleveland’a götürdü
Cleveland Heights’ı gösterdi bana, siz istediğiniz kadar nefret edin
Bu hayatımın aşkı, hey, hey, hey

[Verse 2]
Ben herkese göre değilim ama onun en sevdiği tat benim
O bana “Bir melek gibi görünüyorsun” diyor, onlarsa “Şu ka—dan nefret ediyorum”
Bak, şu verandası olan ev var ya, çocukken orada yaşardı
O hep “sonsuza dek” deyip duruyor, demek ki okumamış—

[Pre-Chorus]
Benim ne kadar sahte olduğuma dair o zehir zemberek yorumu
Ve onun benden daha genç birini bulabileceğini
Ne demek istediklerini anlıyorum
Ve sanırım şimdi—

[Chorus]
Hepimizin kabul edebileceği bir şey var
Ama sevgilim neyi seviyorsa onu seviyor, oh-woah, oh-oh
Beni çoktan Cleveland’a götürdü
Cleveland Heights’ı gösterdi bana, siz istediğiniz kadar nefret edin
Bu hayatımın aşkı, hey, hey, hey

[Bridge]
O neyi seviyorsa onu seviyor ve beni seviyor
O neyi seviyorsa onu seviyor ve beni seviyor
Şu koskoca dünyada tek ihtiyacın olan şey bir kişi bulmak
Seni tamamen çekilmez bulmayan bir kişi
Ve şimdi önemli bir duyurum var
Ben benimkini buldum
(Aynen öyle)
Evet, ben benimkini buldum
(Hey, hey, hey)
Evet, buldum
Evet, işte bu—

[Chorus]
Hepimizin kabul edebileceği bir şey
(Sanırım bunda anlaşıyoruz ama)
Ama sevgilim neyi seviyorsa onu seviyor, oh-woah, oh-oh
Beni çoktan Cleveland’a götürdü
(Cleveland’a)
Şimdi beyazlar içindeyim, siz istediğiniz kadar nefret edin
(Evet)
Bu hayatımın aşkı
(Hey, hey, hey)`,
    annotations: {
      "en fazla dört": "Birini genellikle on üzerinden puanlama mantığıyla küçümseyen bir ifade. Burada anlatıcı kendisi hakkında yapılan aşağılayıcı yorumları alaycı biçimde tekrar ediyor.",
      "kız kıza dayanışan": "Diğer kadınları destekleyen, kadın dayanışmasına önem veren kadın için kullanılan güncel bir ifade. “She was never a girls’ girl” sözü, anlatıcının kadınlarla dayanışmadığını iddia eden eleştirileri taklit ediyor.",
      "Cleveland Heights": "Cleveland Heights’a gönderme. Burada sevgilisinin büyüdüğü çevreyi ona göstermesi, ilişkinin daha kişisel ve ciddi bir noktaya geldiğini anlatıyor. “Heights” kelimesi aynı zamanda İngilizcede “yükseklikler” anlamına geldiği için hafif bir kelime oyunu da taşıyor.",
      "herkese göre değilim": "İlk anda herkesin hoşuna gitmeyen ama zamanla sevilen bir tat veya şey için kullanılan deyim. “The taste of me is acquired” derken anlatıcı kendisiyle dalga geçerek “Ben herkese göre değilim ama onun favorisi benim” diyor.",
      "en sevdiği tat": "“En sevdiği yemek” ifadesi, hemen önceki “acquired taste” metaforunu devam ettiriyor. Anlatıcı kendisini bir “tat/yemek” gibi tarif ederek sevgilisinin onu özellikle tercih ettiğini söylüyor.",
      "zehir zemberek yorumu": "Çok sert, acımasız ve iğneleyici yorum veya görüş. Burada anlatıcının “sahte” olduğu ve sevgilisinin daha genç birini bulabileceği yönündeki eleştiriler kastediliyor.",
      "çekilmez": "Katlanılmaz, çekilmez, tahammül edilmesi zor. Bridge’in esprisi, son derece romantik bir aşk ilanını kendisiyle dalga geçen bir cümleye çevirmesi: “Bu dünyada seni tamamen çekilmez bulmayan bir kişi bulman yeter.”",
      "neyi seviyorsa onu seviyor": "Kelime kelime “Neyi seviyorsa onu seviyor.” Alt metni ise çok net: başkalarının ne düşündüğü önemli değil; sevgilisinin zevki, tercihi ve sevdiği kişi anlatıcının kendisi.",
      "beyazlar içindeyim": "Beyaz giymek burada güçlü biçimde gelinlik ve evlilik çağrışımı yaratıyor. Şarkının sonunda dışarıdan gelen eleştiriler sürerken ilişkinin çok daha ciddi bir noktaya geldiği ima ediliyor.",
      "hayatımın aşkı": "“Hayatımın aşkı.” Şarkının tamamındaki dedikodu ve eleştirilerin karşısına konulan en net cevap: anlatıcı için diğer insanların değerlendirmelerinden çok kendi ilişkisinin gerçekliği önemli."
    }
  },
  {
    song: "Pink Clouding",
    original: `[Verse 1]
Met the magenta sunrise
Fuchsia forever intertwined
Threw the rosewood on the fire
Neither of us knew at the time
That I was a liar

[Pre-Chorus]
And it was so good
Letting you want me, so good
To make promises, promises, pr-pr-promises

[Chorus]
But I was pink (Pink) cloudin' from the thrill of it (Hahaha)
Skydivin' as you wrapped your arms around my body
Gray (Gray) rockin' where the arrow hit (Hahaha)
Years later, I still wonder how to tell you sorry
I didn't wanna let you down (Pink cloud, pink cloud)
So I left you up there on a pink cloud (Pink cloud)

[Verse 2]
He cut me crimson, bled me dry
He crossеd my heart, I hoped to die (Hopеd to die)
Ripped all my orchids from the vine
You met me at a cursed time
I told you I was fine

[Pre-Chorus]
And you were so good (Good)
That's why you haunt me like you should (Should)
And all my promises, promises, pr-pr-promises

[Chorus]
'Cause I was pink (Pink) cloudin' from the thrill of it (Hahaha)
Skydivin' as you wrapped your arms around my body
Gray (Gray) rockin' where the arrow hit (Hahaha)
Years later, I still wonder how to tell you sorry
I didn't want to let you down (Pink cloud, pink cloud)
So I left you up there on a (Pink) pink cloud (Pink cloud)

[Bridge]
I hope you realized my kind of trouble wasn't worth it
And the way I treated you, you never deserved it
And I swear to God, to this day
I wake up scared that I left scars on a good person
And I gave you zero reason to believe it, so be it
But it didn't mean nothin' just 'cause I could leave it

[Chorus]
I was pink cloudin' from the thrill of it (Hahaha)
Skydivin' as you wrapped your arms around my body
Gray (Gray) rockin' where the arrow hit (Where the arrow hit; Hahaha)
Years later, I still wonder how to tell you sorry

[Outro]
I hope you landed safely on the ground, hey (Pink cloud, pink cloud)
And I hope you're so happy now (Pink cloud, pink cloud)
I didn't wanna let you down (Pink cloud, pink cloud)
So I left you up there (Pink cloud) on a pink cloud`,
    translation: `[Verse 1]
Morcumsu bir gün doğumunda buluştuk
Fuşya gibi, sonsuza dek birbirimize dolanmıştık
Gül ağacını ateşe attık
O zaman ikimiz de bilmiyorduk
Benim bir yalancı olduğumu

[Pre-Chorus]
Ve öyle güzeldi ki
Beni istemene izin vermek, öyle güzeldi ki
Sana sözler vermek, sözler, sözler, s-s-sözler

[Chorus]
Ama ben pembe bulutlardaydım, sırf o heyecanın sarhoşluğuyla
Kollarını bedenime sardığında sanki serbest düşüşteydim
Okun saplandığı yerde kendimi gri bir kayaya çevirdim
Yıllar sonra bile sana nasıl özür dileyeceğimi düşünüyorum
Seni hayal kırıklığına uğratmak istemedim
Bu yüzden seni orada, pembe bulutların üzerinde bıraktım

[Verse 2]
O beni kıpkırmızı kesti, kanımı son damlasına kadar akıttı
Kalbimin üstüne çarpı çekti, ben de ölmeyi diledim
Tüm orkidelerimi dallarından kopardı
Sen benimle lanetli bir zamanda tanıştın
Ben de sana “İyiyim” dedim

[Pre-Chorus]
Ve sen öyle iyiydin ki
İşte bu yüzden hak ettiğim gibi peşimi bırakmıyorsun
Ve verdiğim bütün o sözler, sözler, sözler, s-s-sözler

[Chorus]
Çünkü ben pembe bulutlardaydım, sırf o heyecanın sarhoşluğuyla
Kollarını bedenime sardığında sanki serbest düşüşteydim
Okun saplandığı yerde kendimi gri bir kayaya çevirdim
Yıllar sonra bile sana nasıl özür dileyeceğimi düşünüyorum
Seni hayal kırıklığına uğratmak istemedim
Bu yüzden seni orada, pembe bulutların üzerinde bıraktım

[Bridge]
Umarım benim gibi bir belanın buna değmediğini anlamışsındır
Ve sana nasıl davrandıysam, bunların hiçbirini hak etmedin
Tanrı’ya yemin ederim, bugün bile
İyi bir insanda izler bıraktığım korkusuyla uyanıyorum
Buna inanman için sana tek bir neden bile vermedim, öyle olsun
Ama çekip gidebilmiş olmam, hiçbir şey hissetmediğim anlamına gelmiyordu

[Chorus]
Ben pembe bulutlardaydım, sırf o heyecanın sarhoşluğuyla
Kollarını bedenime sardığında sanki serbest düşüşteydim
Okun saplandığı yerde kendimi gri bir kayaya çevirdim
Yıllar sonra bile sana nasıl özür dileyeceğimi düşünüyorum

[Outro]
Umarım yere sağ salim indin
Ve umarım şimdi gerçekten çok mutlusundur
Seni hayal kırıklığına uğratmak istemedim
Bu yüzden seni orada, pembe bulutların üzerinde bıraktım`,
    annotations: {
      "pembe bulutlardaydım": "Bağımlılıktan iyileşmenin erken döneminde görülebilen yoğun iyimserlik ve coşku hâlini anlatan bir terimdir. Şarkıda bu ifade romantik bir ilişkiye uyarlanıyor: her şeyin büyülü, kusursuz ve olduğundan daha parlak göründüğü geçici bir coşku hâli.",
      "gri bir kayaya çevirdim": "Birine karşı mümkün olduğunca nötr, tepkisiz ve duygusal olarak erişilemez davranma yöntemine verilen isim. Şarkıda anlatıcı, duygusal olarak yaralandığı noktada kendini kapattığını anlatıyor.",
      "Kalbimin üstüne çarpı çekti, ben de ölmeyi diledim": "“Cross my heart and hope to die” İngilizcede “yemin ederim” anlamında kullanılan bir kalıptır. Burada ifade ikiye bölünerek kelime oyununa dönüştürülüyor: “kalbimin üstüne çarpı çekti / ben de ölmeyi diledim.”",
      "orkidelerimi": "Orkideler burada kırılganlık, güzellik ve canlılık imgesi olarak kullanılıyor. “Ripped all my orchids from the vine” anlatıcının duygusal olarak parçalanmasını çağrıştırıyor.",
      "pembe bulutların üzerinde": "“Pembe bulut” ve “serbest düşüş” imgeleri birlikte çalışıyor. İlişkinin verdiği yoğun coşku yükselme hissi yaratırken, sonunda kaçınılmaz bir düşüş ihtimalini de taşıyor.",
      "tek bir neden bile vermedim": "Anlatıcı, hisleri gerçek olsa bile davranışlarının karşı tarafa buna inanması için hiçbir sebep vermediğini kabul ediyor.",
      "çekip gidebilmiş olmam": "“Çekip gidebilmiş olmam, hiçbir şey hissetmediğim anlamına gelmez.” Şarkının pişmanlık temasını en açık anlatan satırlardan biri."
    }
  },
  {
    song: "Babylon",
    original: `[Verse 1]
The casino doesn't like when you run the tables
And though the box is wrapped up nice, it's just a cage to you
Those electric fences buzz
The stallion flees the stable
And that small town's even smaller now in your rear view
You ran with all the wild things
A liberated libertine who then longed for home

[Pre-Chorus]
'Cause it's where you're from
Aunt Virginia with a church dress on
No elbows on the table
And the neighbor's lawn always looked better
Your hand-me-down sweater should've been from the mall

[Chorus]
And you hate this song
But you wake up on the train with your headphones gone
Then that melody is all you want
You never knew that it was Babylon
'Til it was gone

[Verse 2]
Give the people what they want, then you keep it movin'
Make your plans and friends, a stranger's makeup on your tie
Twenty watches in the safe 'cause your time is money
Love is ice upon the ladder that you need to climb
She captured your attention, so free of all pretension
It stopped you cold

[Pre-Chorus]
Because she loved you so
Pretty as a picture that you didn't post
Lookin' at you like you're made of solid gold
Never official
You mention you're single to the girls at the bar

[Chorus]
You hate this song
But you wake up on the train with your headphones gone
And then that melody is all you want
You never knew that it was Babylon
'Til it was gone

[Bridge]
You're using nostalgia as a weapon to hurt yourself
But darling, you end up hurting everybody else
The self-harm of never being where you are
It's bedtime, but you're sitting in your car
You're missin' all the best parts

[Pre-Chorus]
And they're all at home
She's hangin' Christmas lights with your son
Sneak into the bathroom to call her mom
And say, "It's not workin'
It's just not worth it if we're not what he wants"

[Chorus]
But you love this song
You wake up on the train with your headphones gone
Then that melody is all you want
You never knew that it was Babylon
And now, it's almost gone

[Pre-Chorus]
Aunt Virginia with a church dress on
No elbows on the table (It's almost gone)
And the neighbor's lawn always looked better
Your hand-me-down sweater should've been from the mall

[Chorus]
But you love this song
You wake up on the train and you're all alone
Then that memory is all you want
You never knew that it was Babylon
'Til it was gone`,
    translation: `[Verse 1]
Kumarhane, masaları silip süpürmenden hoşlanmaz
Kutusu ne kadar güzel paketlenmiş olsa da, senin için hâlâ bir kafes
O elektrikli teller vızıldıyor
Aygır ahırdan kaçıyor
Ve o küçük kasaba, dikiz aynanda şimdi daha da küçük
Bütün o vahşi şeylerle birlikte koştun
Sınır tanımayan, özgür biriydin
Sonra da eve dönmeyi özledin

[Pre-Chorus]
Çünkü orası senin geldiğin yer
Kilise elbisesiyle Virginia Teyze
Masada dirsek yok
Komşunun çimleri hep daha güzel görünürdü
Üstündeki o elden düşme kazak keşke mağazadan alınmış olsaydı

[Chorus]
Ve sen bu şarkıdan nefret ediyorsun
Ama trende uyanıyorsun, kulaklıkların yok
Sonra tek istediğin şey o melodi oluyor
Onun Babil olduğunu hiç bilmiyordun
Ta ki kaybedene kadar

[Verse 2]
İnsanlara istediklerini veriyorsun, sonra yoluna devam ediyorsun
Planlar yapıyorsun, arkadaşlar ediniyorsun
Kravatında tanımadığın birinin makyajı
Kasada yirmi saat var
Çünkü senin için vakit nakit
Tırmanman gereken merdivende aşk, ayağını kaydıracak bir buz
O kadın dikkatini çekti
Üstelik hiç yapmacık değildi
Ve seni olduğun yerde durdurdu

[Pre-Chorus]
Çünkü seni öyle sevdi ki
Paylaşmadığın bir fotoğraf kadar güzeldi
Sana sanki saf altından yapılmışsın gibi bakıyordu
İlişkinizin adını hiç koymadın
Bardaki kızlara hâlâ bekâr olduğunu söylüyorsun

[Chorus]
Bu şarkıdan nefret ediyorsun
Ama trende uyanıyorsun, kulaklıkların yok
Sonra tek istediğin şey o melodi oluyor
Onun Babil olduğunu hiç bilmiyordun
Ta ki kaybedene kadar

[Bridge]
Nostaljiyi kendini incitmek için bir silah gibi kullanıyorsun
Ama canım, sonunda herkesi incitiyorsun
Hiçbir zaman bulunduğun yerde olamamanın kendine verdiği zarar
Uyku vakti ama sen hâlâ arabada oturuyorsun
Hayatın en güzel kısımlarını kaçırıyorsun

[Pre-Chorus]
Ve hepsi evde
O, oğlunla Noel ışıklarını asıyor
Annesini aramak için gizlice banyoya gidiyor
Ve şöyle diyor:
“Yürümüyor bu iş
Eğer istediği şey biz değilsek
Buna değmez”

[Chorus]
Ama sen bu şarkıyı seviyorsun
Trende uyanıyorsun, kulaklıkların yok
Sonra tek istediğin şey o melodi oluyor
Onun Babil olduğunu hiç bilmiyordun
Ve şimdi neredeyse yok olmak üzere

[Pre-Chorus]
Kilise elbisesiyle Virginia Teyze
Masada dirsek yok
(Neredeyse yok)
Komşunun çimleri hep daha güzel görünürdü
Üstündeki o elden düşme kazak keşke mağazadan alınmış olsaydı

[Chorus]
Ama sen bu şarkıyı seviyorsun
Trende uyanıyorsun ve yapayalnızsın
Sonra tek istediğin şey o hatıra oluyor
Onun Babil olduğunu hiç bilmiyordun
Ta ki kaybedene kadar`,
    annotations: {
      "masaları silip süpürmenden": "Kumar veya bilardo bağlamında masayı tamamen domine etmek, herkesi yenmek ve oyunu silip süpürmek anlamına gelir. Burada karakterin başarı ve kontrol arzusunu anlatıyor.",
      "Kutusu ne kadar güzel paketlenmiş olsa da, senin için hâlâ bir kafes": "Dışarıdan güzel, düzenli ve cazip görünen bir hayatın karakter için yine de kısıtlayıcı bir kafes gibi hissettirmesi.",
      "Aygır ahırdan kaçıyor": "Aygırın ahırdan kaçması, karakterin evinden, küçük kasabasından ve kendisini sınırlayan hayattan kaçışını simgeliyor.",
      "Sınır tanımayan, özgür biriydin": "Toplumsal kurallara ve geleneksel ahlaki beklentilere pek aldırmadan özgür yaşayan kişi. Burada “günahkâr” gibi ahlaki bir yargıdan çok, sınırsız ve başına buyruk bir yaşam tarzı vurgulanıyor.",
      "Komşunun çimleri hep daha güzel görünürdü": "“The grass is always greener on the other side” deyimine gönderme. Başkasının hayatının her zaman daha iyi görünmesi anlamına gelir.",
      "elden düşme kazak": "Bir başkasından, genellikle aile içinden kalan eski kıyafet. Burada karakterin çocukken sahip olduklarından utanması ve daha “iyi” görünen bir hayatı istemesi anlatılıyor.",
      "Babil": "Antik Babil; zenginlik, ihtişam, güç ve görkem imgeleriyle anılır. Şarkıda karakterin bir zamanlar değersiz veya sıradan gördüğü hayatın, kaybettikten sonra aslında ne kadar kıymetli olduğunu fark etmesiyle bağlantılı bir metafor olarak kullanılıyor.",
      "vakit nakit": "“Vakit nakittir” deyimine doğrudan gönderme. Yirmi saat sahibi olması, başarı ve statü takıntısını abartılı biçimde gösteriyor.",
      "aşk, ayağını kaydıracak bir buz": "Karakter için aşk, başarı merdivenini tırmanırken ayağını kaydırabilecek bir engel gibi görülüyor.",
      "Paylaşmadığın bir fotoğraf kadar güzeldi": "Kadının güzelliği ve ilişkinin özelliği sosyal medyada sergilenmiyor. Bu satır, özel olanla gösteriş için paylaşılan hayat arasındaki farkı vurguluyor.",
      "İlişkinizin adını hiç koymadın": "İlişkinin hiçbir zaman açıkça tanımlanmaması veya resmîleştirilmemesi. Karakter buna rağmen kendisini başkalarına hâlâ bekâr olarak tanıtıyor.",
      "Hiçbir zaman bulunduğun yerde olamamanın kendine verdiği zarar": "Fiziksel kendine zarar vermeden değil, sürekli geçmişi özlemek veya geleceğin peşinde koşmak yüzünden içinde bulunduğun anı kaçırmanın insanın kendine verdiği duygusal zarardan bahsediyor.",
      "hepsi evde": "Karakter dışarıda kendi düşünceleriyle oyalanırken, hayatının en değerli insanları evde onsuz yaşamaya devam ediyor.",
      "neredeyse yok olmak üzere": "Karakter ancak kaybetmeye çok yaklaştığında, sahip olduğu hayatın değerini fark etmeye başlıyor.",
      "Ta ki kaybedene kadar": "“Ta ki kaybedene kadar.” Şarkının ana fikrini özetliyor: insan bazen bir şeyin değerini ancak artık elinde olmadığında anlayabiliyor."
    }
  }
];

loadEnv();
const spotifyAuth = {
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
};

for (let index = 0; index < songs.length; index += 1) {
  const item = songs[index];
  const match = await searchTrackBundle({ artist: "Taylor Swift", title: item.song }, spotifyAuth);
  if (!match.matched || match.bundle.album?.name !== "The Life of a Showgirl: The Encore") {
    throw new Error(`${item.song} için doğru Spotify albüm eşleşmesi bulunamadı.`);
  }
  const record = {
    id: String(5288 + index),
    song: item.song,
    artist: "Taylor Swift",
    date: `2026-09-25T10:0${index}:00.000Z`,
    languages: { original: "en", translation: "tr", annotations: "tr" },
    spotify: match.bundle,
    genius: null,
    stanzas: align(item.original, item.translation, item.annotations),
    youtubeUrl: null,
    translatorNote: null,
    savedAt: `2026-09-25T10:0${index}:00.000Z`,
  };
  const updated = await preparePublishRecord(record);
  await writePublishData(updated);
  console.log(`${updated.result.title} -> /${updated.result.slug}/`);
}
