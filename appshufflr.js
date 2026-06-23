const KEY='aaf6a69ac6e873f723913a154d4c475c';
let userRegion='US';
async function detectRegion(){
  try{
    const r=await fetch('https://ipapi.co/json/');
    const d=await r.json();
    if(d.country_code) userRegion=d.country_code;
  }catch(e){
    try{
      const loc=navigator.language||'en-US';
      const parts=loc.split('-');
      if(parts.length>1) userRegion=parts[1].toUpperCase();
    }catch(e2){}
  }
}
const IMG='https://image.tmdb.org/t/p/';
const SHUFFLR_TRANSLATIONS={
en:{
'nav.shows':'Shows','nav.playlist':'Playlist','nav.options':'Options',
'sidebar.browse':'Browse','sidebar.seasons':'Seasons',
'search.placeholder':'Search shows or movies...','search.recentLabel':'Recent Searches',
'section.yourPlaylists':'-- YOUR PLAYLISTS --','section.yourShows':'-- YOUR SHOWS --',
'section.recentlyWatched':'-- RECENTLY WATCHED --','section.myPlaylists':'MY PLAYLISTS',
'section.becauseYouWatched':'-- BECAUSE YOU WATCHED',
'btn.logOut':'Log Out','btn.save':'Save','btn.play':'Play','btn.edit':'Edit','btn.addShow':'Add Show',
'btn.createNewPlaylist':'Create New Playlist','btn.shuffle':'Shuffle','btn.back':'Back',
'btn.logIn':'Log In','btn.signUp':'Sign Up','btn.delete':'Delete','btn.share':'Share',
'btn.create':'Create','btn.cancel':'Cancel','btn.confirm':'Confirm','btn.done':'Done','btn.next':'NEXT',
'btn.submit':'Submit','btn.replayOnboarding':'Replay Onboarding',
'options.language':'LANGUAGE','options.account':'ACCOUNT','options.feedback':'FEEDBACK','options.help':'HELP',
'options.languageDesc':"Choose Shufflr's display language.",
'options.feedbackDesc':'Got an idea or found a bug? We want to hear it.',
'options.feedbackPlaceholder':'Type your feedback here...',
'greeting.hello':'HELLO','greeting.signIn':'SIGN IN TO GET STARTED','greeting.thankYou':'THANK YOU',
'carousel.clickMe':'click me','carousel.next':'CLICK HERE >',
'empty.noPlaylists':'No playlists yet',
'empty.noPlaylistsHint':'Hit Shufflr on your selected service and use the dropdown to create one and save shows.',
'empty.noYourShowsTitle':'Nothing tuned in yet',
'empty.noYourShowsHint':'Shows you add to playlists will appear here',
'empty.noPlaylistsPlaylistTab':'No playlists yet.<br>Create one above, then add shows from Max using the + button in the Shufflr dropdown.',
'empty.noRecentlyWatchedTitle':'Nothing watched yet',
'empty.noRecentlyWatched':'Episodes you watch will appear here.',
'empty.noEpisodes':'No episodes found. Try a lower rating.','empty.nothingAdded':'Nothing added yet.',
'empty.loading':'LOADING...',
'auth.email':'Email','auth.password':'Password',
'theme.dark':'Dark','theme.light':'Light',
'connect.connectYourService':'Connect Your Service','connect.connected':'Connected','connect.connect':'Connect',
'connect.yourService':'YOUR SERVICE','connect.pickService':'Pick the service you use. Episode links will open there.',
'connect.done':'Done',
'pl.newPlaylistPlaceholder':'New playlist name...','pl.addShowHint':'Add shows directly from Max using the + button in the Shufflr dropdown',
'pl.show':'show','pl.shows':'shows','pl.item':'item','pl.items':'items','pl.fullShow':'Full Show',
'modal.addToPlaylist':'ADD TO PLAYLIST','modal.choosePlaylist':'Choose a playlist or create a new one.',
'toast.feedbackSent':'FEEDBACK SENT!','toast.playlistCopied':'PLAYLIST COPIED!',
'label.upNext':'▶ UP NEXT','label.movie':'MOVIE','btn.readMore':'Read more','btn.readLess':'Read less',
'ob.step1':'STEP 1 OF 4','ob.title1':'SEARCH ANY SHOW OR MOVIE','ob.desc1':"Shufflr doesn't stream. We help you decide. Type any show or movie into the search bar and select it to load all its episodes instantly.",
'ob.step2':'STEP 2 OF 4','ob.title2':'HIT SHUFFLE','ob.desc2':'Press the shuffle arrows or hit Space on your keyboard to get 3 random episode picks from your show.',
'ob.step3':'STEP 3 OF 4','ob.title3':'FILTER & BUILD PLAYLISTS','ob.desc3':'Use the rating slider to filter top episodes, block seasons, and build playlists across multiple shows.',
'ob.step4':'STEP 4 OF 4','ob.title4':'PICK YOUR SERVICE','ob.desc4':'Which streaming service do you use most? Episode links will open there. You can change this any time in settings.',
'help.step1':'STEP 1 OF 4','help.title1':'GET THE EXTENSION','help.desc1':'Download Shufflr from the Chrome Web Store and pin it to your browser.',
'help.step2':'STEP 2 OF 4','help.title2':'SIGN IN','help.desc2':'Create a Shufflr account and sign in to make and save your playlists and shuffle saved shows.',
'help.step3':'STEP 3 OF 4','help.title3':'CONNECT YOUR SERVICE','help.desc3':'Select your streaming service in the bottom left corner. Shufflr works one service at a time.',
'help.step4':'STEP 4 OF 4','help.title4':'START SHUFFLING','help.desc4':'Open your streaming service and play any show. Use the Shufflr button in the player to shuffle episodes and add shows to playlists.',
'drawer.close':'Close','drawer.cancelAdd':'Cancel',
},
es:{
'nav.shows':'Series','nav.playlist':'Lista','nav.options':'Opciones',
'sidebar.browse':'Explorar','sidebar.seasons':'Temporadas',
'search.placeholder':'Buscar series o películas...','search.recentLabel':'Búsquedas recientes',
'section.yourPlaylists':'-- TUS LISTAS --','section.yourShows':'-- TUS SERIES --',
'section.recentlyWatched':'-- VISTO RECIENTEMENTE --','section.myPlaylists':'MIS LISTAS',
'section.becauseYouWatched':'-- PORQUE VISTE',
'btn.logOut':'Cerrar sesión','btn.save':'Guardar','btn.play':'Reproducir','btn.edit':'Editar','btn.addShow':'Añadir serie',
'btn.createNewPlaylist':'Crear nueva lista','btn.shuffle':'Aleatorio','btn.back':'Volver',
'btn.logIn':'Iniciar sesión','btn.signUp':'Registrarse','btn.delete':'Eliminar','btn.share':'Compartir',
'btn.create':'Crear','btn.cancel':'Cancelar','btn.confirm':'Confirmar','btn.done':'Listo','btn.next':'SIGUIENTE',
'btn.submit':'Enviar','btn.replayOnboarding':'Repetir tutorial',
'options.language':'IDIOMA','options.account':'CUENTA','options.feedback':'COMENTARIOS','options.help':'AYUDA',
'options.languageDesc':'Elige el idioma de Shufflr.',
'options.feedbackDesc':'¿Tienes una idea o encontraste un error? Queremos saberlo.',
'options.feedbackPlaceholder':'Escribe tus comentarios aquí...',
'greeting.hello':'HOLA','greeting.signIn':'INICIA SESIÓN PARA EMPEZAR','greeting.thankYou':'GRACIAS',
'carousel.clickMe':'haz clic','carousel.next':'SIGUIENTE >',
'empty.noPlaylists':'Aún no hay listas.',
'empty.noPlaylistsHint':'En Max, pulsa el botón Shufflr y usa el menú de listas para crear una. Aparecerá aquí automáticamente.',
'empty.noYourShows':'Las series que añadas a listas aparecerán aquí.',
'empty.noPlaylistsPlaylistTab':'Aún no hay listas.<br>Crea una arriba y añade series desde Max con el botón + del menú Shufflr.',
'empty.noRecentlyWatchedTitle':'Nada visto aún',
'empty.noRecentlyWatched':'Los episodios que veas aparecerán aquí.',
'empty.noEpisodes':'No se encontraron episodios. Prueba con una calificación más baja.','empty.nothingAdded':'Nada añadido aún.',
'empty.loading':'CARGANDO...',
'auth.email':'Correo','auth.password':'Contraseña',
'theme.dark':'Oscuro','theme.light':'Claro',
'connect.connectYourService':'Conectar tu servicio','connect.connected':'Conectado','connect.connect':'Conectar',
'connect.yourService':'TU SERVICIO','connect.pickService':'Elige el servicio que usas. Los enlaces se abrirán allí.',
'connect.done':'Listo',
'pl.newPlaylistPlaceholder':'Nombre de la nueva lista...','pl.addShowHint':'Añade series desde Max con el botón + del menú Shufflr',
'pl.show':'serie','pl.shows':'series','pl.item':'elemento','pl.items':'elementos','pl.fullShow':'Serie completa',
'modal.addToPlaylist':'AÑADIR A LISTA','modal.choosePlaylist':'Elige una lista o crea una nueva.',
'toast.feedbackSent':'¡COMENTARIO ENVIADO!','toast.playlistCopied':'¡LISTA COPIADA!',
'label.upNext':'▶ A CONTINUACIÓN','label.movie':'PELÍCULA','btn.readMore':'Leer más','btn.readLess':'Leer menos',
'ob.step1':'PASO 1 DE 4','ob.title1':'BUSCA CUALQUIER SERIE O PELÍCULA','ob.desc1':'Shufflr no transmite. Te ayudamos a decidir. Escribe una serie o película en la barra de búsqueda y selecciónala para cargar todos sus episodios al instante.',
'ob.step2':'PASO 2 DE 4','ob.title2':'PULSA ALEATORIO','ob.desc2':'Pulsa las flechas de aleatorio o la tecla Espacio para obtener 3 episodios al azar de tu serie.',
'ob.step3':'PASO 3 DE 4','ob.title3':'FILTRA Y CREA LISTAS','ob.desc3':'Usa el control de calificación para filtrar episodios, bloquear temporadas y crear listas con varias series.',
'ob.step4':'PASO 4 DE 4','ob.title4':'ELIGE TU SERVICIO','ob.desc4':'¿Qué servicio de streaming usas más? Los enlaces se abrirán allí. Puedes cambiarlo en cualquier momento en ajustes.',
'help.step1':'PASO 1 DE 4','help.title1':'INSTALA LA EXTENSIÓN','help.desc1':'Descarga la extensión Shufflr desde Chrome Web Store y fíjala en tu navegador.',
'help.step2':'PASO 2 DE 4','help.title2':'INICIA SESIÓN','help.desc2':'Crea una cuenta gratuita de Shufflr o inicia sesión para guardar tus listas entre sesiones.',
'help.step3':'PASO 3 DE 4','help.title3':'CONECTA TU SERVICIO','help.desc3':'Selecciona tu servicio de streaming en la esquina inferior izquierda. Shufflr funciona con un servicio a la vez.',
'help.step4':'PASO 4 DE 4','help.title4':'EMPIEZA A MEZCLAR','help.desc4':'Abre tu servicio de streaming y reproduce cualquier serie. Usa el botón Shufflr en el reproductor para mezclar episodios y añadir series a listas.',
'drawer.close':'Cerrar','drawer.cancelAdd':'Cancelar',
},
fr:{
'nav.shows':'Séries','nav.playlist':'Playlist','nav.options':'Options',
'sidebar.browse':'Parcourir','sidebar.seasons':'Saisons',
'search.placeholder':'Rechercher séries ou films...','search.recentLabel':'Recherches récentes',
'section.yourPlaylists':'-- VOS PLAYLISTS --','section.yourShows':'-- VOS SÉRIES --',
'section.recentlyWatched':'-- RÉCEMMENT VU --','section.myPlaylists':'MES PLAYLISTS',
'section.becauseYouWatched':'-- PARCE QUE VOUS AVEZ VU',
'btn.logOut':'Déconnexion','btn.save':'Enregistrer','btn.play':'Lire','btn.edit':'Modifier','btn.addShow':'Ajouter une série',
'btn.createNewPlaylist':'Créer une playlist','btn.shuffle':'Mélanger','btn.back':'Retour',
'btn.logIn':'Connexion','btn.signUp':'Inscription','btn.delete':'Supprimer','btn.share':'Partager',
'btn.create':'Créer','btn.cancel':'Annuler','btn.confirm':'Confirmer','btn.done':'Terminé','btn.next':'SUIVANT',
'btn.submit':'Envoyer','btn.replayOnboarding':'Revoir le tutoriel',
'options.language':'LANGUE','options.account':'COMPTE','options.feedback':'COMMENTAIRES','options.help':'AIDE',
'options.languageDesc':"Choisissez la langue d'affichage de Shufflr.",
'options.feedbackDesc':'Une idée ou un bug ? Dites-le nous.',
'options.feedbackPlaceholder':'Écrivez vos commentaires ici...',
'greeting.hello':'BONJOUR','greeting.signIn':'CONNECTEZ-VOUS POUR COMMENCER','greeting.thankYou':'MERCI',
'carousel.clickMe':'cliquez ici','carousel.next':'SUIVANT >',
'empty.noPlaylists':'Pas encore de playlists.',
'empty.noPlaylistsHint':'Sur Max, appuyez sur Shufflr et utilisez le menu playlist pour en créer une. Elle apparaîtra ici automatiquement.',
'empty.noYourShows':'Les séries que vous ajoutez aux playlists apparaîtront ici.',
'empty.noPlaylistsPlaylistTab':'Pas encore de playlists.<br>Créez-en une ci-dessus, puis ajoutez des séries depuis Max avec le bouton + du menu Shufflr.',
'empty.noRecentlyWatchedTitle':'Rien regardé pour l\'instant',
'empty.noRecentlyWatched':'Les épisodes regardés apparaîtront ici.',
'empty.noEpisodes':'Aucun épisode trouvé. Essayez une note plus basse.','empty.nothingAdded':'Rien ajouté pour l\'instant.',
'empty.loading':'CHARGEMENT...',
'auth.email':'E-mail','auth.password':'Mot de passe',
'theme.dark':'Sombre','theme.light':'Clair',
'connect.connectYourService':'Connecter votre service','connect.connected':'Connecté','connect.connect':'Connecter',
'connect.yourService':'VOTRE SERVICE','connect.pickService':'Choisissez le service que vous utilisez. Les liens s\'ouvriront là.',
'connect.done':'Terminé',
'pl.newPlaylistPlaceholder':'Nom de la nouvelle playlist...','pl.addShowHint':'Ajoutez des séries depuis Max avec le bouton + du menu Shufflr',
'pl.show':'série','pl.shows':'séries','pl.item':'élément','pl.items':'éléments','pl.fullShow':'Série complète',
'modal.addToPlaylist':'AJOUTER À LA PLAYLIST','modal.choosePlaylist':'Choisissez une playlist ou créez-en une nouvelle.',
'toast.feedbackSent':'COMMENTAIRE ENVOYÉ !','toast.playlistCopied':'PLAYLIST COPIÉE !',
'label.upNext':'▶ À SUIVRE','label.movie':'FILM','btn.readMore':'Lire plus','btn.readLess':'Lire moins',
'ob.step1':'ÉTAPE 1 SUR 4','ob.title1':'RECHERCHEZ UNE SÉRIE OU UN FILM','ob.desc1':'Shufflr ne diffuse pas. Nous vous aidons à choisir. Tapez une série ou un film dans la barre de recherche pour charger tous ses épisodes instantanément.',
'ob.step2':'ÉTAPE 2 SUR 4','ob.title2':'APPUYEZ SUR MÉLANGER','ob.desc2':'Appuyez sur les flèches de mélange ou la barre d\'espace pour obtenir 3 épisodes aléatoires.',
'ob.step3':'ÉTAPE 3 SUR 4','ob.title3':'FILTRER ET CRÉER DES PLAYLISTS','ob.desc3':'Utilisez le curseur de note pour filtrer les épisodes, bloquer des saisons et créer des playlists.',
'ob.step4':'ÉTAPE 4 SUR 4','ob.title4':'CHOISISSEZ VOTRE SERVICE','ob.desc4':'Quel service utilisez-vous le plus ? Les liens s\'ouvriront là. Vous pouvez changer à tout moment dans les réglages.',
'help.step1':'ÉTAPE 1 SUR 4','help.title1':'INSTALLEZ L\'EXTENSION','help.desc1':'Téléchargez l\'extension Shufflr depuis le Chrome Web Store et épinglez-la à votre navigateur.',
'help.step2':'ÉTAPE 2 SUR 4','help.title2':'CONNECTEZ-VOUS','help.desc2':'Créez un compte Shufflr gratuit ou connectez-vous pour sauvegarder vos playlists entre les sessions.',
'help.step3':'ÉTAPE 3 SUR 4','help.title3':'CONNECTEZ VOTRE SERVICE','help.desc3':'Sélectionnez votre service de streaming en bas à gauche. Shufflr fonctionne avec un service à la fois.',
'help.step4':'ÉTAPE 4 SUR 4','help.title4':'COMMENCEZ À MÉLANGER','help.desc4':'Ouvrez votre service de streaming et lancez une série. Utilisez le bouton Shufflr dans le lecteur pour mélanger les épisodes et ajouter des séries aux playlists.',
'drawer.close':'Fermer','drawer.cancelAdd':'Annuler',
},
pt:{
'nav.shows':'Séries','nav.playlist':'Playlist','nav.options':'Opções',
'sidebar.browse':'Explorar','sidebar.seasons':'Temporadas',
'search.placeholder':'Buscar séries ou filmes...','search.recentLabel':'Pesquisas recentes',
'section.yourPlaylists':'-- SUAS PLAYLISTS --','section.yourShows':'-- SUAS SÉRIES --',
'section.recentlyWatched':'-- ASSISTIDO RECENTEMENTE --','section.myPlaylists':'MINHAS PLAYLISTS',
'section.becauseYouWatched':'-- PORQUE VOCÊ ASSISTIU',
'btn.logOut':'Sair','btn.save':'Salvar','btn.play':'Reproduzir','btn.edit':'Editar','btn.addShow':'Adicionar série',
'btn.createNewPlaylist':'Criar nova playlist','btn.shuffle':'Aleatório','btn.back':'Voltar',
'btn.logIn':'Entrar','btn.signUp':'Cadastrar','btn.delete':'Excluir','btn.share':'Compartilhar',
'btn.create':'Criar','btn.cancel':'Cancelar','btn.confirm':'Confirmar','btn.done':'Concluído','btn.next':'PRÓXIMO',
'btn.submit':'Enviar','btn.replayOnboarding':'Rever tutorial',
'options.language':'IDIOMA','options.account':'CONTA','options.feedback':'FEEDBACK','options.help':'AJUDA',
'options.languageDesc':'Escolha o idioma de exibição do Shufflr.',
'options.feedbackDesc':'Tem uma ideia ou encontrou um bug? Queremos saber.',
'options.feedbackPlaceholder':'Digite seu feedback aqui...',
'greeting.hello':'OLÁ','greeting.signIn':'ENTRE PARA COMEÇAR','greeting.thankYou':'OBRIGADO',
'carousel.clickMe':'clique aqui','carousel.next':'PRÓXIMO >',
'empty.noPlaylists':'Nenhuma playlist ainda.',
'empty.noPlaylistsHint':'No Max, toque no botão Shufflr e use o menu de playlists para criar uma. Ela aparecerá aqui automaticamente.',
'empty.noYourShows':'As séries que você adicionar às playlists aparecerão aqui.',
'empty.noPlaylistsPlaylistTab':'Nenhuma playlist ainda.<br>Crie uma acima e adicione séries do Max com o botão + do menu Shufflr.',
'empty.noRecentlyWatchedTitle':'Nada assistido ainda',
'empty.noRecentlyWatched':'Episódios assistidos aparecerão aqui.',
'empty.noEpisodes':'Nenhum episódio encontrado. Tente uma nota mais baixa.','empty.nothingAdded':'Nada adicionado ainda.',
'empty.loading':'CARREGANDO...',
'auth.email':'E-mail','auth.password':'Senha',
'theme.dark':'Escuro','theme.light':'Claro',
'connect.connectYourService':'Conectar seu serviço','connect.connected':'Conectado','connect.connect':'Conectar',
'connect.yourService':'SEU SERVIÇO','connect.pickService':'Escolha o serviço que você usa. Os links abrirão lá.',
'connect.done':'Concluído',
'pl.newPlaylistPlaceholder':'Nome da nova playlist...','pl.addShowHint':'Adicione séries do Max com o botão + do menu Shufflr',
'pl.show':'série','pl.shows':'séries','pl.item':'item','pl.items':'itens','pl.fullShow':'Série completa',
'modal.addToPlaylist':'ADICIONAR À PLAYLIST','modal.choosePlaylist':'Escolha uma playlist ou crie uma nova.',
'toast.feedbackSent':'FEEDBACK ENVIADO!','toast.playlistCopied':'PLAYLIST COPIADA!',
'label.upNext':'▶ A SEGUIR','label.movie':'FILME','btn.readMore':'Ler mais','btn.readLess':'Ler menos',
'ob.step1':'PASSO 1 DE 4','ob.title1':'BUSQUE QUALQUER SÉRIE OU FILME','ob.desc1':'O Shufflr não transmite. Ajudamos você a decidir. Digite uma série ou filme na barra de busca para carregar todos os episódios instantaneamente.',
'ob.step2':'PASSO 2 DE 4','ob.title2':'TOQUE EM ALEATÓRIO','ob.desc2':'Pressione as setas de aleatório ou a barra de espaço para obter 3 episódios aleatórios.',
'ob.step3':'PASSO 3 DE 4','ob.title3':'FILTRAR E CRIAR PLAYLISTS','ob.desc3':'Use o controle de nota para filtrar episódios, bloquear temporadas e criar playlists.',
'ob.step4':'PASSO 4 DE 4','ob.title4':'ESCOLHA SEU SERVIÇO','ob.desc4':'Qual serviço você mais usa? Os links abrirão lá. Você pode mudar a qualquer momento nas configurações.',
'help.step1':'PASSO 1 DE 4','help.title1':'INSTALE A EXTENSÃO','help.desc1':'Baixe a extensão Shufflr na Chrome Web Store e fixe-a no navegador.',
'help.step2':'PASSO 2 DE 4','help.title2':'ENTRE NA CONTA','help.desc2':'Crie uma conta gratuita do Shufflr ou entre para salvar suas playlists entre sessões.',
'help.step3':'PASSO 3 DE 4','help.title3':'CONECTE SEU SERVIÇO','help.desc3':'Selecione seu serviço de streaming no canto inferior esquerdo. O Shufflr funciona com um serviço por vez.',
'help.step4':'PASSO 4 DE 4','help.title4':'COMECE A MISTURAR','help.desc4':'Abra seu serviço de streaming e reproduza qualquer série. Use o botão Shufflr no player para embaralhar episódios e adicionar séries às playlists.',
'drawer.close':'Fechar','drawer.cancelAdd':'Cancelar',
},
ja:{
'nav.shows':'番組','nav.playlist':'プレイリスト','nav.options':'設定',
'sidebar.browse':'閲覧','sidebar.seasons':'シーズン',
'search.placeholder':'番組や映画を検索...','search.recentLabel':'最近の検索',
'section.yourPlaylists':'-- あなたのプレイリスト --','section.yourShows':'-- あなたの番組 --',
'section.recentlyWatched':'-- 最近視聴 --','section.myPlaylists':'マイプレイリスト',
'section.becauseYouWatched':'-- 視聴履歴に基づくおすすめ',
'btn.logOut':'ログアウト','btn.save':'保存','btn.play':'再生','btn.edit':'編集','btn.addShow':'番組を追加',
'btn.createNewPlaylist':'新規プレイリスト','btn.shuffle':'シャッフル','btn.back':'戻る',
'btn.logIn':'ログイン','btn.signUp':'登録','btn.delete':'削除','btn.share':'共有',
'btn.create':'作成','btn.cancel':'キャンセル','btn.confirm':'確認','btn.done':'完了','btn.next':'次へ',
'btn.submit':'送信','btn.replayOnboarding':'チュートリアルを再生',
'options.language':'言語','options.account':'アカウント','options.feedback':'フィードバック','options.help':'ヘルプ',
'options.languageDesc':'Shufflrの表示言語を選択してください。',
'options.feedbackDesc':'アイデアやバグを見つけましたか？お知らせください。',
'options.feedbackPlaceholder':'フィードバックを入力...',
'greeting.hello':'こんにちは','greeting.signIn':'ログインして始める','greeting.thankYou':'ありがとう',
'carousel.clickMe':'クリック','carousel.next':'次へ >',
'empty.noPlaylists':'プレイリストはまだありません。',
'empty.noPlaylistsHint':'MaxでShufflrボタンを押し、プレイリストメニューから作成してください。ここに自動的に表示されます。',
'empty.noYourShows':'プレイリストに追加した番組がここに表示されます。',
'empty.noPlaylistsPlaylistTab':'プレイリストはまだありません。<br>上で作成し、MaxのShufflrメニューの+ボタンから番組を追加してください。',
'empty.noRecentlyWatchedTitle':'まだ視聴履歴がありません',
'empty.noRecentlyWatched':'視聴したエピソードがここに表示されます。',
'empty.noEpisodes':'エピソードが見つかりません。評価を下げてみてください。','empty.nothingAdded':'まだ何も追加されていません。',
'empty.loading':'読み込み中...',
'auth.email':'メール','auth.password':'パスワード',
'theme.dark':'ダーク','theme.light':'ライト',
'connect.connectYourService':'サービスを接続','connect.connected':'接続済み','connect.connect':'接続',
'connect.yourService':'サービス','connect.pickService':'使用するサービスを選んでください。リンクはそこで開きます。',
'connect.done':'完了',
'pl.newPlaylistPlaceholder':'新しいプレイリスト名...','pl.addShowHint':'MaxのShufflrメニューの+ボタンから番組を追加',
'pl.show':'番組','pl.shows':'番組','pl.item':'項目','pl.items':'項目','pl.fullShow':'全話',
'modal.addToPlaylist':'プレイリストに追加','modal.choosePlaylist':'プレイリストを選ぶか新規作成してください。',
'toast.feedbackSent':'送信しました！','toast.playlistCopied':'コピーしました！',
'label.upNext':'▶ 次のエピソード','label.movie':'映画','btn.readMore':'続きを読む','btn.readLess':'折りたたむ',
'ob.step1':'ステップ 1/4','ob.title1':'番組や映画を検索','ob.desc1':'Shufflrは配信しません。選ぶお手伝いをします。検索バーに入力して、全エピソードをすぐ読み込みましょう。',
'ob.step2':'ステップ 2/4','ob.title2':'シャッフルを押す','ob.desc2':'シャッフル矢印またはスペースキーで、ランダムに3話選びます。',
'ob.step3':'ステップ 3/4','ob.title3':'フィルターとプレイリスト','ob.desc3':'評価スライダーでエピソードを絞り、シーズンをブロックし、プレイリストを作れます。',
'ob.step4':'ステップ 4/4','ob.title4':'サービスを選択','ob.desc4':'よく使うストリーミングサービスは？リンクはそこで開きます。設定でいつでも変更できます。',
'help.step1':'ステップ 1/4','help.title1':'拡張機能を入手','help.desc1':'Chrome Web StoreからShufflr拡張機能をダウンロードし、ブラウザにピン留めしてください。',
'help.step2':'ステップ 2/4','help.title2':'サインイン','help.desc2':'無料のShufflrアカウントを作成するかサインインして、プレイリストをセッション間で保存します。',
'help.step3':'ステップ 3/4','help.title3':'サービスを接続','help.desc3':'左下でストリーミングサービスを選択してください。Shufflrは一度に1つのサービスで動作します。',
'help.step4':'ステップ 4/4','help.title4':'シャッフルを開始','help.desc4':'ストリーミングサービスを開いて番組を再生します。プレイヤーのShufflrボタンでエピソードをシャッフルし、プレイリストに番組を追加できます。',
'drawer.close':'閉じる','drawer.cancelAdd':'キャンセル',
},
};

function getSavedLanguage(){
  return localStorage.getItem('shufflrLanguage')||localStorage.getItem('shufflr_language')||'en';
}

function t(key){
  const lang=getSavedLanguage();
  const table=SHUFFLR_TRANSLATIONS[lang]||SHUFFLR_TRANSLATIONS.en;
  return table[key]??SHUFFLR_TRANSLATIONS.en[key]??key;
}

function applyStaticTranslations(){
  document.querySelectorAll('[data-i18n]').forEach(el=>{el.textContent=t(el.getAttribute('data-i18n'));});
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el=>{el.placeholder=t(el.getAttribute('data-i18n-placeholder'));});
  const search=document.getElementById('search-input');
  if(search&&!search.hasAttribute('data-i18n-placeholder'))search.placeholder=t('search.placeholder');
  const themeBtn=document.getElementById('theme-btn');
  if(themeBtn)themeBtn.textContent=t(isLightMode?'theme.light':'theme.dark');
  if(typeof updateConnectBtnLabel==='function')updateConnectBtnLabel();
  document.querySelectorAll('#service-list .service-connect-btn').forEach(b=>{
    b.textContent=b.classList.contains('connected')?t('connect.connected'):t('connect.connect');
  });
}

function applyTranslationsToDOM(){
  applyStaticTranslations();
  document.querySelectorAll('[data-i18n-html]').forEach(el=>{el.innerHTML=t(el.getAttribute('data-i18n-html'));});
}

function ensureHiddenAuthField(id,type){
  let el=document.getElementById(id);
  if(!el){
    el=document.createElement('input');
    el.id=id;
    el.type=type;
    el.style.display='none';
    document.body.appendChild(el);
  }
  return el;
}

function triggerSidebarAuth(action){
  const email=document.getElementById('sidebar-email')?.value?.trim()||'';
  const password=document.getElementById('sidebar-password')?.value||'';
  ensureHiddenAuthField('auth-email','email').value=email;
  ensureHiddenAuthField('auth-password','password').value=password;
  const btnId=action==='signup'?'auth-signup-btn':'auth-login-btn';
  let btn=document.getElementById(btnId);
  if(!btn){
    btn=document.createElement('button');
    btn.id=btnId;
    btn.type='button';
    btn.style.display='none';
    document.body.appendChild(btn);
  }
  btn.click();
}

const TOPBAR_GUEST_DISMISS_KEY='shufflr_guest_dismissed';
let topbarSigninCardOpen=false;
let topbarSigninAutoOpenScheduled=false;

function setAuthPillHidden(hidden){
  const pill=document.getElementById('auth-pill-btn');
  if(!pill)return;
  pill.classList.toggle('hidden',hidden);
}

function closeTopbarSigninCard(){
  const card=document.getElementById('topbar-signin-card');
  if(card)card.hidden=true;
  topbarSigninCardOpen=false;
  const indicator=document.getElementById('auth-signed-in-indicator');
  if(indicator?.style.display!=='flex')setAuthPillHidden(false);
}

function openTopbarSigninCard(){
  const card=ensureTopbarSigninCard();
  if(!card||topbarSigninCardOpen)return;
  card.hidden=false;
  topbarSigninCardOpen=true;
  setAuthPillHidden(true);
}

async function maybeAutoOpenTopbarSigninCard(){
  if(topbarSigninAutoOpenScheduled)return;
  topbarSigninAutoOpenScheduled=true;
  if(sessionStorage.getItem(TOPBAR_GUEST_DISMISS_KEY))return;
  const loggedIn=typeof window.shufflrIsLoggedIn==='function'?await window.shufflrIsLoggedIn():false;
  if(loggedIn)return;
  setTimeout(async()=>{
    if(sessionStorage.getItem(TOPBAR_GUEST_DISMISS_KEY))return;
    const stillLoggedIn=typeof window.shufflrIsLoggedIn==='function'?await window.shufflrIsLoggedIn():false;
    if(stillLoggedIn||topbarSigninCardOpen)return;
    openTopbarSigninCard();
  },800);
}

function getEmailFromSession(){
  try{
    const raw=localStorage.getItem(SHUFFLR_SUPABASE_SESSION_KEY);
    const p=raw?JSON.parse(raw):null;
    const token=p?.accessToken;
    if(!token)return'';
    const payload=JSON.parse(atob(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));
    return payload.email||'';
  }catch{
    return'';
  }
}

function buildTopbarSigninCardHtml(){
  return`<div id="topbar-signin-card" class="topbar-signin-card" hidden>
    <div class="topbar-signin-card-hero">SHUFFLE YOUR SHOWS</div>
    <div class="topbar-signin-card-header">New here? Shufflr adds shuffle play to your shows.</div>
    <div class="topbar-signin-card-body">You must download Shufflr to use the extension. Connect your streaming service and start shuffling.</div>
    <div class="topbar-signin-divider"></div>
    <input id="topbar-email" class="topbar-signin-input" type="email" placeholder="email" autocomplete="email" />
    <input id="topbar-password" class="topbar-signin-input" type="password" placeholder="password" autocomplete="current-password" />
    <div class="topbar-signin-btn-row">
      <button type="button" id="topbar-login-btn" onclick="event.stopPropagation(); triggerTopbarAuth('login');">LOG IN</button>
      <button type="button" id="topbar-signup-btn" class="topbar-signin-btn-secondary" onclick="event.stopPropagation(); triggerTopbarAuth('signup');">SIGN UP</button>
    </div>
    <div class="topbar-signin-divider"></div>
    <div class="topbar-signin-btn-row">
      <button type="button" id="topbar-setup-btn" class="topbar-signin-btn-secondary" onclick="event.stopPropagation(); openSetupStepsFromTopbar();">See setup steps</button>
      <button type="button" id="topbar-guest-btn" class="topbar-signin-btn-secondary" onclick="event.stopPropagation(); continueAsGuestFromTopbar();">Continue as guest</button>
    </div>
  </div>`;
}

function bindTopbarSigninCardListeners(card){
  if(!card||card.dataset.listenersBound)return;
  card.dataset.listenersBound='true';
  card.querySelector('#topbar-login-btn')?.addEventListener('click',(e)=>{
    e.preventDefault();
    e.stopPropagation();
    triggerTopbarAuth('login');
  });
  card.querySelector('#topbar-signup-btn')?.addEventListener('click',(e)=>{
    e.preventDefault();
    e.stopPropagation();
    triggerTopbarAuth('signup');
  });
  card.querySelector('#topbar-setup-btn')?.addEventListener('click',(e)=>{
    e.preventDefault();
    e.stopPropagation();
    openSetupStepsFromTopbar();
  });
  card.querySelector('#topbar-guest-btn')?.addEventListener('click',(e)=>{
    e.preventDefault();
    e.stopPropagation();
    continueAsGuestFromTopbar();
  });
  card.addEventListener('click',(e)=>{ e.stopPropagation(); });
}

function ensureTopbarSigninCard(){
  let card=document.getElementById('topbar-signin-card');
  if(!card){
    const wrap=document.getElementById('topbar-auth-zone');
    if(!wrap)return null;
    wrap.insertAdjacentHTML('beforeend',buildTopbarSigninCardHtml());
    card=document.getElementById('topbar-signin-card');
  }
  bindTopbarSigninCardListeners(card);
  return card;
}

function triggerTopbarAuth(action){
  const email=document.getElementById('topbar-email')?.value?.trim()||'';
  const password=document.getElementById('topbar-password')?.value||'';
  ensureHiddenAuthField('auth-email','email').value=email;
  ensureHiddenAuthField('auth-password','password').value=password;
  const btnId=action==='signup'?'auth-signup-btn':'auth-login-btn';
  let btn=document.getElementById(btnId);
  if(!btn){
    btn=document.createElement('button');
    btn.id=btnId;
    btn.type='button';
    btn.style.display='none';
    document.body.appendChild(btn);
  }
  btn.click();
}

function triggerSidebarLogout(){
  let btn=document.getElementById('auth-logout-btn');
  if(!btn){
    btn=document.createElement('button');
    btn.id='auth-logout-btn';
    btn.type='button';
    btn.style.display='none';
    document.body.appendChild(btn);
  }
  btn.click();
}

function ensureTopbarAuthZonePosition(){
  const authZone=document.getElementById('topbar-auth-zone');
  if(authZone)authZone.style.position='absolute';
}

function openSetupStepsFromTopbar(){
  closeTopbarSigninCard();
  optionsCarouselIndex=1;
  setTimeout(()=>{
    setNav('options');
    ensureTopbarAuthZonePosition();
    document.getElementById('options-carousel')?.scrollIntoView({behavior:'smooth',block:'start'});
  },50);
}

function continueAsGuestFromTopbar(){
  sessionStorage.setItem('shufflr_guest_dismissed','1');
  closeTopbarSigninCard();
}

function formatSignedInLabel(email){
  if(!email)return'Signed in';
  const part=String(email).split('@')[0]?.trim();
  return part||'Signed in';
}

async function updateTopbarAuthZone(){
  const pill=document.getElementById('auth-pill-btn');
  const indicator=document.getElementById('auth-signed-in-indicator');
  const label=document.getElementById('auth-signed-in-label');
  if(!pill||!indicator)return;
  const loggedIn=typeof window.shufflrIsLoggedIn==='function'?await window.shufflrIsLoggedIn():false;
  if(loggedIn){
    setAuthPillHidden(true);
    indicator.style.display='flex';
    if(label)label.textContent=formatSignedInLabel(getEmailFromSession());
    closeTopbarSigninCard();
  }else{
    indicator.style.display='none';
    setAuthPillHidden(topbarSigninCardOpen);
  }
}

async function toggleTopbarSigninCard(){
  const loggedIn=typeof window.shufflrIsLoggedIn==='function'?await window.shufflrIsLoggedIn():false;
  if(loggedIn)return;
  const card=ensureTopbarSigninCard();
  if(!card)return;
  if(topbarSigninCardOpen){
    closeTopbarSigninCard();
    return;
  }
  openTopbarSigninCard();
}

function rerenderCurrentTab(){
  if(currentNav==='playlist')renderPlaylistPage();
  else if(currentNav==='options')renderOptionsPage();
  else if(currentNav==='shows'){
    if(!currentShow)renderHomeScreen('shows');
    else if(currentType==='movie')renderMovieMain(currentShow);
    else renderMain();
  }
}

function getObSteps(){
  return[
    {step:t('ob.step1'),title:t('ob.title1'),desc:t('ob.desc1')},
    {step:t('ob.step2'),title:t('ob.title2'),desc:t('ob.desc2')},
    {step:t('ob.step3'),title:t('ob.title3'),desc:t('ob.desc3')},
    {step:t('ob.step4'),title:t('ob.title4'),desc:t('ob.desc4'),picker:true},
  ];
}

let currentShow=null,currentType='tv',allSeasons=[],blockedSeasons=new Set();
let selectedSeason=null,allEpisodes={},currentNav='shows';
let minRating=0,searchTimer=null,isLightMode=false;
let watchHistory=JSON.parse(localStorage.getItem('shufflr_history')||'[]');
let recentShows=JSON.parse(localStorage.getItem('shufflr_recent')||'[]');
const SHUFFLR_PLAYLISTS_KEY='shufflr_playlists';
const SHUFFLR_ACTIVE_PLAYLIST_KEY='shufflr_active_playlist';
let playlists=JSON.parse(localStorage.getItem(SHUFFLR_PLAYLISTS_KEY)||'[]');
let expandedPlaylistIndex=null;

function handleExtensionPlaylistSync(payload){
  playlists=Array.isArray(payload)?payload:[];
  localStorage.setItem(SHUFFLR_PLAYLISTS_KEY,JSON.stringify(playlists));
  window.postMessage({type:'SHUFFLR_SYNC_PLAYLISTS',source:'shufflr-web',playlists},'*');
  try{
    if(typeof chrome!=='undefined'&&chrome.storage&&chrome.storage.local){
      chrome.storage.local.set({[SHUFFLR_PLAYLISTS_KEY]:playlists});
    }
  }catch(e){}
  if(currentNav==='playlist')renderPlaylistPage();
  const modal=document.getElementById('playlist-modal');
  if(modal?.classList.contains('open'))renderPlaylistModal();
}

function installExtensionPlaylistSync(){
  if(typeof chrome!=='undefined'&&chrome.runtime&&chrome.runtime.onMessage){
    chrome.runtime.onMessage.addListener((message,_sender,sendResponse)=>{
      if(message?.type!=='SHUFFLR_SYNC_PLAYLISTS')return;
      handleExtensionPlaylistSync(message.payload);
      sendResponse({ok:true});
      return true;
    });
  }

  window.addEventListener('message',(event)=>{
    if(event.source!==window)return;
    if(event.data?.source!=='shufflr-extension')return;
    if(event.data?.type!=='SHUFFLR_SYNC_PLAYLISTS')return;
    handleExtensionPlaylistSync(event.data.payload);
  });
}

installExtensionPlaylistSync();

window.addEventListener('shufflr-playlists-merged',(event)=>{
  handleExtensionPlaylistSync(event.detail);
});

window.addEventListener('shufflr-auth-changed',()=>{
  updateTopbarAuthZone();
  maybeAutoOpenTopbarSigninCard();
  if(currentNav==='shows'&&!currentShow){
    renderHomeScreen('shows');
  }else if(currentNav==='options'){
    renderOptionsPage();
  }
});

const SHUFFLR_SUPABASE_SESSION_KEY='shufflr_supabase_session';

function saveSupabaseSessionForExtension(sessionPayload){
  if(sessionPayload?.user?.id&&sessionPayload?.access_token){
    localStorage.setItem(SHUFFLR_SUPABASE_SESSION_KEY,JSON.stringify({
      userId:sessionPayload.user.id,
      accessToken:sessionPayload.access_token,
      refreshToken:sessionPayload.refresh_token||null,
      expiresAt:sessionPayload.expires_at||null,
    }));
  }else{
    localStorage.removeItem(SHUFFLR_SUPABASE_SESSION_KEY);
  }
  window.postMessage({type:'SHUFFLR_SUPABASE_SESSION_SYNC',source:'shufflr-web'},'*');
}

window.addEventListener('message',(event)=>{
  if(event.source!==window)return;
  if(event.data?.source!=='shufflr-web')return;
  if(event.data?.type!=='SHUFFLR_AUTH_SESSION')return;
  saveSupabaseSessionForExtension(event.data.session);
});

// Build a TMDB poster URL from a path, full URL, or bare filename.
function buildPosterUrl(posterPath,size='w185'){
  if(!posterPath)return'';
  const text=String(posterPath).trim();
  if(!text)return'';
  if(/^https?:\/\//i.test(text)){
    const tmdbMatch=text.match(/\/t\/p\/(?:original|w\d+)\/(.+)$/);
    if(tmdbMatch)return `${IMG}${size}/${tmdbMatch[1]}`;
    return text;
  }
  const path=text.startsWith('/')?text:`/${text}`;
  return IMG+size+path;
}

function getHomeShowDedupeKey(show){
  if(show?.id!=null&&show.id!=='')return`id:${show.id}`;
  const maxId=getShowMaxId(show);
  if(maxId)return`max:${maxId}`;
  const nameKey=normalizePlShowName(getShowLabel(show));
  if(nameKey)return`name:${nameKey}`;
  return'';
}

function getActivePlaylistShowsForHome(allPlaylists=playlists){
  const seen=new Set();
  const items=[];
  const source=Array.isArray(allPlaylists)?allPlaylists:playlists;
  for(let pi=0;pi<source.length;pi++){
    const plShows=source[pi]?.shows||[];
    for(let si=0;si<plShows.length;si++){
      const show=plShows[si];
      if(show?.release_date)continue;
      const key=getHomeShowDedupeKey(show);
      if(!key||seen.has(key))continue;
      seen.add(key);
      items.push({show,playlistIndex:pi,showIndex:si});
    }
  }
  return{items};
}

const YOUR_SHOWS_SMILEY_SVG=`<svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="8" y="8" width="8" height="8" fill="#23A8E0"/>
  <rect x="32" y="8" width="8" height="8" fill="#23A8E0"/>
  <rect x="4" y="24" width="4" height="4" fill="#23A8E0"/>
  <rect x="40" y="24" width="4" height="4" fill="#23A8E0"/>
  <rect x="8" y="32" width="4" height="4" fill="#23A8E0"/>
  <rect x="12" y="36" width="4" height="4" fill="#23A8E0"/>
  <rect x="16" y="38" width="16" height="4" fill="#23A8E0"/>
  <rect x="32" y="36" width="4" height="4" fill="#23A8E0"/>
  <rect x="36" y="32" width="4" height="4" fill="#23A8E0"/>
</svg>`;

function yourShowNeedsPosterLookup(show){
  const hasTmdbId=show?.id!=null&&/^\d+$/.test(String(show.id));
  const hasPoster=!!(show?.poster_path&&buildPosterUrl(show.poster_path,'w185'));
  return!hasTmdbId||!hasPoster;
}

function getRecentlyWatchedPosterKey(showName){
  return stripServiceSuffixFromShowName(showName).toLowerCase();
}

function stripServiceSuffixFromShowName(showName){
  const text=String(showName||'').trim();
  const bulletIdx=text.indexOf(' • ');
  return bulletIdx>=0?text.slice(0,bulletIdx).trim():text;
}

function getRecentlyWatchedServiceLabel(){
  return 'HBO Max';
}

function formatRecentlyWatchedCardTitle(entry){
  const name=stripServiceSuffixFromShowName(entry?.show_name);
  const service=getRecentlyWatchedServiceLabel();
  return name?`${name} • ${service}`:service;
}

function buildDeferredPosterHtml(showKey,posterUrl,imgStyle){
  if(posterUrl){
    return `<img data-show-key="${escapeHtml(showKey)}" src="${posterUrl}" onerror="this.style.background='#1a1a1a'" style="${imgStyle}" />`;
  }
  return `<div class="card-poster-wrap" style="position:relative;width:100%;height:100%;background:#1a1a1a;">
    <div class="card-poster-placeholder" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;">${YOUR_SHOWS_SMILEY_SVG}</div>
    <img data-show-key="${escapeHtml(showKey)}" src="" alt="" style="${imgStyle}opacity:0;" />
  </div>`;
}

function applyPosterToDomByShowKey(showKey,posterUrl){
  document.querySelectorAll('img[data-show-key]').forEach(img=>{
    if(img.dataset.showKey!==showKey)return;
    img.src=posterUrl;
    img.style.opacity='1';
    img.style.display='';
    img.closest('.card-poster-wrap')?.querySelector('.card-poster-placeholder')?.remove();
  });
}

async function resolveCardPostersFromTmdb(lookupMap,size='w185'){
  for(const [showKey,query] of lookupMap){
    const searchQuery=stripServiceSuffixFromShowName(query);
    if(!searchQuery)continue;
    try{
      const r=await fetch(`https://api.themoviedb.org/3/search/tv?api_key=${KEY}&query=${encodeURIComponent(searchQuery)}`);
      const d=await r.json();
      const match=(d.results||[]).find(result=>result.poster_path)||(d.results||[])[0];
      if(!match?.poster_path)continue;
      applyPosterToDomByShowKey(showKey,buildPosterUrl(match.poster_path,size));
    }catch(e){
      console.error('[Shufflr] Poster lookup failed:',searchQuery,e);
    }
  }
}

function buildYourShowsPosterHtml(show,showKey){
  const posterUrl=buildPosterUrl(show.poster_path,'w185');
  const needsLookup=yourShowNeedsPosterLookup(show);
  const imgStyle='width:100%;height:220px;object-fit:cover;background:#1a1a1a;';
  if(needsLookup&&!posterUrl){
    return buildDeferredPosterHtml(showKey,'',imgStyle);
  }
  return buildDeferredPosterHtml(showKey,posterUrl,imgStyle);
}

async function resolveYourShowsPosters(items){
  const lookupMap=new Map();
  for(const {show} of (items||[])){
    if(!yourShowNeedsPosterLookup(show))continue;
    const showKey=getHomeShowDedupeKey(show);
    const query=getShowLabel(show);
    if(!showKey||!query)continue;
    lookupMap.set(showKey,query);
  }
  await resolveCardPostersFromTmdb(lookupMap,'w185');
}

async function resolveRecentlyWatchedPosters(entries){
  const lookupMap=new Map();
  for(const entry of (entries||[])){
    if(buildPosterUrl(entry.poster_path,'w300'))continue;
    const query=stripServiceSuffixFromShowName(entry.show_name);
    const showKey=getRecentlyWatchedPosterKey(query);
    if(!showKey||!query)continue;
    lookupMap.set(showKey,query);
  }
  await resolveCardPostersFromTmdb(lookupMap,'w300');
}

let nowPlayingShow=null;
let nowPlayingLastSeen=0;
let nowPlayingShuffleShow=null;
let nowPlayingShufflePickedAt=0;
let nowPlayingShufflePlaylistIndex=null;
let nowPlayingShuffleShowIndex=null;
let nowPlayingStaticAnimId=null;
let homeEmptyStaticAnimId=null;
let nowPlayingPosterGlitchTimer=null;
const NOW_PLAYING_SHUFFLE_TTL_MS=3600000;
let currentShuffleMode='single';

function syncNowPlayingModeToggleUi(){
  const toggle=document.getElementById('now-playing-mode-toggle');
  if(!toggle)return;
  toggle.querySelectorAll('.now-playing-mode-btn').forEach(btn=>{
    btn.classList.toggle('is-active',btn.dataset.mode===currentShuffleMode);
  });
}

function setNowPlayingShuffleMode(mode){
  if(mode!=='single'&&mode!=='all')return;
  currentShuffleMode=mode;
  syncNowPlayingModeToggleUi();
}

function ensureNowPlayingModeToggle(host){
  const container=host||document.getElementById('now-playing-card-host');
  if(!container)return;
  let toggle=document.getElementById('now-playing-mode-toggle');
  if(!toggle){
    toggle=document.createElement('div');
    toggle.id='now-playing-mode-toggle';
    toggle.className='now-playing-mode-toggle';
    toggle.innerHTML=`<button type="button" class="now-playing-mode-btn is-active" data-mode="single">SINGLE</button><button type="button" class="now-playing-mode-btn" data-mode="all">ALL</button>`;
    toggle.querySelectorAll('.now-playing-mode-btn').forEach(btn=>{
      btn.addEventListener('click',()=>setNowPlayingShuffleMode(btn.dataset.mode));
    });
    container.appendChild(toggle);
  }
  syncNowPlayingModeToggleUi();
}

function getNowPlayingHelpPopupHtml(){
  return`<p><span>SINGLE:</span> shuffles episodes of the current show selected</p><p><span>ALL:</span> shuffles across all shows in Your Shows</p><p><span>Power:</span> shuffles a show to start with</p>`;
}

function closeNowPlayingHelpPopup(){
  const popup=document.getElementById('now-playing-help-popup');
  if(popup)popup.hidden=true;
}

function positionNowPlayingHelpPopup(){
  const popup=document.getElementById('now-playing-help-popup');
  const anchor=document.getElementById('now-playing-card-host');
  const sidebar=document.getElementById('sidebar');
  if(!popup||popup.hidden||!anchor)return;
  const sidebarRect=sidebar?.getBoundingClientRect();
  const anchorRect=anchor.getBoundingClientRect();
  const left=(sidebarRect?sidebarRect.right:anchorRect.right)+8;
  popup.style.left=`${Math.round(left)}px`;
  popup.style.top=`${Math.round(anchorRect.top)}px`;
}

function onNowPlayingHelpDocumentClick(e){
  const popup=document.getElementById('now-playing-help-popup');
  if(!popup||popup.hidden)return;
  if(e.target.closest('#now-playing-help-popup')||e.target.closest('#now-playing-help-btn'))return;
  closeNowPlayingHelpPopup();
}

function installNowPlayingHelpPopupListeners(){
  if(window.__shufflrHelpPopupListeners)return;
  window.__shufflrHelpPopupListeners=true;
  document.addEventListener('click',onNowPlayingHelpDocumentClick);
  window.addEventListener('resize',positionNowPlayingHelpPopup);
  window.addEventListener('scroll',positionNowPlayingHelpPopup,true);
}

function ensureNowPlayingHelpPopup(){
  let popup=document.getElementById('now-playing-help-popup');
  if(!popup){
    popup=document.createElement('div');
    popup.id='now-playing-help-popup';
    popup.className='now-playing-help-popup';
    popup.hidden=true;
    popup.setAttribute('role','dialog');
    popup.setAttribute('aria-label','Shuffle help');
    popup.innerHTML=getNowPlayingHelpPopupHtml();
    document.body.appendChild(popup);
    installNowPlayingHelpPopupListeners();
  }
  return popup;
}

function toggleNowPlayingHelpPopup(e){
  e.preventDefault();
  e.stopPropagation();
  const popup=ensureNowPlayingHelpPopup();
  if(!popup.hidden){
    closeNowPlayingHelpPopup();
    return;
  }
  popup.hidden=false;
  positionNowPlayingHelpPopup();
}

function bindNowPlayingHelpButton(btn){
  if(!btn||btn.dataset.helpBound)return;
  btn.dataset.helpBound='true';
  btn.addEventListener('click',toggleNowPlayingHelpPopup);
}

function ensureNowPlayingHelpControl(row){
  if(!row)return;
  let helpWrap=document.getElementById('now-playing-help-wrap');
  if(!helpWrap){
    helpWrap=document.createElement('div');
    helpWrap.id='now-playing-help-wrap';
    helpWrap.className='now-playing-help-wrap';
    helpWrap.innerHTML=`<button type="button" id="now-playing-help-btn" class="now-playing-help-btn" aria-label="Shuffle help">?</button>`;
    row.insertBefore(helpWrap,row.firstChild);
    bindNowPlayingHelpButton(helpWrap.querySelector('#now-playing-help-btn'));
  }else{
    if(helpWrap.parentNode!==row){
      row.insertBefore(helpWrap,row.firstChild);
    }
    helpWrap.querySelector('.now-playing-help-tooltip')?.remove();
    bindNowPlayingHelpButton(document.getElementById('now-playing-help-btn'));
  }
}

function reorderNowPlayingHostChildren(host){
  if(!host)return;
  const slot=document.getElementById('now-playing-card-slot');
  const row=document.getElementById('now-playing-actions-row');
  const toggle=document.getElementById('now-playing-mode-toggle');
  const hint=document.getElementById('now-playing-shuffle-hint');
  [slot,row,toggle,hint].filter(Boolean).forEach(el=>host.appendChild(el));
}

function ensureNowPlayingShuffleControls(host){
  const container=host||document.getElementById('now-playing-card-host');
  if(!container)return;
  let row=document.getElementById('now-playing-actions-row');
  if(!row){
    row=document.createElement('div');
    row.id='now-playing-actions-row';
    row.className='now-playing-actions-row';
    container.appendChild(row);
  }
  ensureNowPlayingHelpControl(row);
  if(!document.getElementById('now-playing-shuffle-btn')){
    const btn=document.createElement('button');
    btn.type='button';
    btn.id='now-playing-shuffle-btn';
    btn.className='now-playing-shuffle-btn';
    btn.innerHTML=`<svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="#23A8E0" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
  <path d="M12 2v6"/>
  <path d="M6.8 4.8a9 9 0 1 0 10.4 0"/>
</svg>`;
    btn.addEventListener('click',onNowPlayingShuffleClick);
    row.appendChild(btn);
  }else{
    const btn=document.getElementById('now-playing-shuffle-btn');
    if(btn.parentNode!==row)row.appendChild(btn);
  }
  if(!document.getElementById('now-playing-shuffle-hint')){
    const hint=document.createElement('div');
    hint.id='now-playing-shuffle-hint';
    hint.className='now-playing-shuffle-hint';
    hint.hidden=true;
    hint.textContent='Add shows to playlists to use shuffle.';
    container.appendChild(hint);
  }
  reorderNowPlayingHostChildren(container);
}

function isNowPlayingLive(){
  return !!(nowPlayingShow&&Date.now()-nowPlayingLastSeen<45000);
}

function isNowPlayingShuffleActive(){
  return !!(nowPlayingShuffleShow&&Date.now()-nowPlayingShufflePickedAt<NOW_PLAYING_SHUFFLE_TTL_MS);
}

function clearExpiredNowPlayingShuffle(){
  if(nowPlayingShuffleShow&&Date.now()-nowPlayingShufflePickedAt>=NOW_PLAYING_SHUFFLE_TTL_MS){
    nowPlayingShuffleShow=null;
    nowPlayingShufflePickedAt=0;
    nowPlayingShufflePlaylistIndex=null;
    nowPlayingShuffleShowIndex=null;
  }
}

function ensureNowPlayingCardHost(){
  const connectWrap=document.querySelector('.connect-wrap');
  if(!connectWrap)return;
  const sidebarBottom=connectWrap.closest('.sidebar-bottom')||connectWrap.parentNode;
  let host=document.getElementById('now-playing-card-host');
  if(!host){
    host=document.createElement('div');
    host.id='now-playing-card-host';
    sidebarBottom.insertBefore(host,connectWrap);
  }else if(host.parentNode!==sidebarBottom){
    sidebarBottom.insertBefore(host,connectWrap);
  }
  if(!document.getElementById('now-playing-card-slot')){
    const slot=document.createElement('div');
    slot.id='now-playing-card-slot';
    const existingCard=document.getElementById('now-playing-card');
    if(existingCard){
      existingCard.remove();
      slot.appendChild(existingCard);
    }
    host.insertBefore(slot,host.firstChild);
  }
  ensureNowPlayingModeToggle(host);
  ensureNowPlayingShuffleControls(host);
  reorderNowPlayingHostChildren(host);
}

function setNowPlayingCardSlotHtml(html){
  const slot=document.getElementById('now-playing-card-slot');
  if(!slot)return;
  slot.innerHTML=html;
}

async function onNowPlayingShuffleClick(){
  const loggedIn=typeof window.shufflrIsLoggedIn==='function'?await window.shufflrIsLoggedIn():false;
  if(!loggedIn){showToast('You must sign in to use this feature.');return;}
  const{items}=getActivePlaylistShowsForHome();
  const hint=document.getElementById('now-playing-shuffle-hint');
  if(!items.length){
    if(hint){
      hint.hidden=false;
      clearTimeout(window.__shufflrShuffleHintTimer);
      window.__shufflrShuffleHintTimer=setTimeout(()=>{hint.hidden=true;},4000);
    }
    return;
  }
  if(hint)hint.hidden=true;
  const pick=items[Math.floor(Math.random()*items.length)];
  const{show,playlistIndex,showIndex}=pick;
  nowPlayingShuffleShow=getPlaylistShowLabel(show);
  nowPlayingShufflePickedAt=Date.now();
  nowPlayingShufflePlaylistIndex=playlistIndex;
  nowPlayingShuffleShowIndex=showIndex;
  renderNowPlayingCard();
}

function onNowPlayingShufflePosterClick(){
  if(!isNowPlayingShuffleActive())return;
  if(nowPlayingShufflePlaylistIndex==null||nowPlayingShuffleShowIndex==null)return;
  launchShowStandaloneFromNowPlaying(nowPlayingShufflePlaylistIndex,nowPlayingShuffleShowIndex);
}

function installNowPlayingShufflePosterClick(){
  if(window.__shufflrShufflePosterClickInstalled)return;
  const slot=document.getElementById('now-playing-card-slot');
  if(!slot)return;
  slot.addEventListener('click',(e)=>{
    if(!e.target.closest('.now-playing-poster-wrap--launch'))return;
    onNowPlayingShufflePosterClick();
  });
  window.__shufflrShufflePosterClickInstalled=true;
}

function stopNowPlayingStatic(){
  if(nowPlayingStaticAnimId){
    cancelAnimationFrame(nowPlayingStaticAnimId);
    nowPlayingStaticAnimId=null;
  }
  stopNowPlayingPosterGlitch();
}

function stopNowPlayingPosterGlitch(){
  if(nowPlayingPosterGlitchTimer){
    clearTimeout(nowPlayingPosterGlitchTimer);
    nowPlayingPosterGlitchTimer=null;
  }
  const slot=document.getElementById('now-playing-card-slot');
  if(!slot)return;
  slot.querySelectorAll('.now-playing-poster').forEach(poster=>{
    poster.classList.remove('now-playing-poster-glitch','now-playing-poster-glitch--shift','now-playing-poster-glitch--flash','now-playing-poster-glitch--tear');
    poster.style.removeProperty('--glitch-duration');
    poster.style.removeProperty('--glitch-shift');
  });
  slot.querySelectorAll('.now-playing-poster-tear-strip').forEach(strip=>{
    strip.classList.remove('is-glitching');
    strip.style.removeProperty('--glitch-duration');
    strip.style.removeProperty('--glitch-shift');
    strip.style.clipPath='';
  });
}

function startNowPlayingPosterGlitch(){
  stopNowPlayingPosterGlitch();
  function scheduleNext(){
    const poster=document.querySelector('#now-playing-card-slot .now-playing-vcr-wrap .now-playing-poster');
    if(!poster)return;
    const delay=2200+Math.random()*4800;
    nowPlayingPosterGlitchTimer=setTimeout(()=>{
      const types=['shift','flash','tear'];
      const type=types[Math.floor(Math.random()*types.length)];
      const duration=100+Math.random()*100|0;
      poster.style.setProperty('--glitch-duration',`${duration}ms`);
      if(type==='shift'){
        const px=(Math.random()>0.5?1:-1)*(2+Math.random()*3|0);
        poster.style.setProperty('--glitch-shift',`${px}px`);
        poster.classList.add('now-playing-poster-glitch','now-playing-poster-glitch--shift');
      }else if(type==='flash'){
        poster.classList.add('now-playing-poster-glitch','now-playing-poster-glitch--flash');
      }else{
        const wrap=poster.closest('.now-playing-vcr-wrap');
        let strip=wrap?.querySelector('.now-playing-poster-tear-strip');
        if(!strip&&wrap){
          strip=document.createElement('img');
          strip.className='now-playing-poster-tear-strip';
          strip.alt='';
          strip.setAttribute('aria-hidden','true');
          wrap.insertBefore(strip,poster.nextSibling);
        }
        if(strip&&poster.src){
          strip.src=poster.currentSrc||poster.src;
          const h=poster.offsetHeight||100;
          const bandTop=Math.floor(Math.random()*Math.max(1,h-3));
          const offset=(Math.random()>0.5?1:-1)*(3+Math.random()*4|0);
          strip.style.clipPath=`inset(${bandTop}px 0 ${h-bandTop-2}px 0)`;
          strip.style.setProperty('--glitch-duration',`${duration}ms`);
          strip.style.setProperty('--glitch-shift',`${offset}px`);
          strip.classList.add('is-glitching');
        }
        poster.classList.add('now-playing-poster-glitch','now-playing-poster-glitch--tear');
      }
      nowPlayingPosterGlitchTimer=setTimeout(()=>{
        poster.classList.remove('now-playing-poster-glitch','now-playing-poster-glitch--shift','now-playing-poster-glitch--flash','now-playing-poster-glitch--tear');
        poster.style.removeProperty('--glitch-duration');
        poster.style.removeProperty('--glitch-shift');
        const wrap=poster.closest('.now-playing-vcr-wrap');
        const strip=wrap?.querySelector('.now-playing-poster-tear-strip');
        if(strip){
          strip.classList.remove('is-glitching');
          strip.style.removeProperty('--glitch-duration');
          strip.style.removeProperty('--glitch-shift');
        }
        scheduleNext();
      },duration);
    },delay);
  }
  scheduleNext();
}

function startNowPlayingStatic(canvas){
  stopNowPlayingStatic();
  if(!canvas)return;
  const ctx=canvas.getContext('2d');
  if(!ctx)return;
  const w=canvas.width;
  const h=canvas.height;
  function draw(){
    const imageData=ctx.createImageData(w,h);
    const data=imageData.data;
    for(let i=0;i<data.length;i+=4){
      const v=(Math.random()*255)|0;
      data[i]=v;
      data[i+1]=v;
      data[i+2]=v;
      data[i+3]=255;
    }
    ctx.putImageData(imageData,0,0);
    nowPlayingStaticAnimId=requestAnimationFrame(draw);
  }
  draw();
}

function startNowPlayingPosterVcrOverlay(canvas){
  stopNowPlayingStatic();
  if(!canvas)return;
  const ctx=canvas.getContext('2d');
  if(!ctx)return;
  const w=canvas.width;
  const h=canvas.height;
  const staticAlpha=18;
  const staticDensity=0.32;
  const bandHeight=2;
  const cycleMs=10000;
  const sweepDurationMs=7000;
  const sweepStart=performance.now();
  function draw(now){
    const elapsed=(now-sweepStart)%cycleMs;
    let trackCenter=-bandHeight;
    if(elapsed<sweepDurationMs){
      trackCenter=(elapsed/sweepDurationMs)*h;
    }
    const bandTop=trackCenter-(bandHeight/2);

    ctx.clearRect(0,0,w,h);

    const imageData=ctx.createImageData(w,h);
    const data=imageData.data;
    for(let i=0;i<data.length;i+=4){
      if(Math.random()>staticDensity){
        data[i+3]=0;
        continue;
      }
      const v=(Math.random()*255)|0;
      const alpha=staticAlpha+(Math.random()*10|0);
      data[i]=v;
      data[i+1]=v;
      data[i+2]=v;
      data[i+3]=alpha;
    }
    ctx.putImageData(imageData,0,0);

    if(trackCenter>=-bandHeight&&trackCenter<=h+bandHeight){
      ctx.fillStyle='rgba(110,110,110,0.32)';
      ctx.fillRect(0,bandTop,w,bandHeight);
    }

    nowPlayingStaticAnimId=requestAnimationFrame(draw);
  }
  nowPlayingStaticAnimId=requestAnimationFrame(draw);
}

function initNowPlayingPosterOverlay(){
  const canvas=document.querySelector('#now-playing-card-slot .now-playing-poster-overlay-canvas');
  if(!canvas)return;
  canvas.width=canvas.offsetWidth||166;
  canvas.height=canvas.offsetHeight||100;
  startNowPlayingPosterVcrOverlay(canvas);
  startNowPlayingPosterGlitch();
}

async function resolveNowPlayingPoster(showName,showKey='now-playing:live'){
  const query=stripServiceSuffixFromShowName(showName);
  if(!query)return;
  const lookupMap=new Map([[showKey,query]]);
  await resolveCardPostersFromTmdb(lookupMap,'w185');
}

function renderNowPlayingCard(){
  ensureNowPlayingCardHost();
  const host=document.getElementById('now-playing-card-host');
  if(!host)return;

  clearExpiredNowPlayingShuffle();

  const live=isNowPlayingLive();
  const shuffleActive=!live&&isNowPlayingShuffleActive();
  const card=document.getElementById('now-playing-card');
  const prevState=card?.dataset?.state;
  const prevShow=card?.dataset?.showName;

  if(live&&prevState==='live'&&prevShow===nowPlayingShow&&card)return;
  if(shuffleActive&&prevState==='shuffle'&&prevShow===nowPlayingShuffleShow&&card)return;
  if(!live&&!shuffleActive&&prevState==='no-signal'&&card)return;

  stopNowPlayingStatic();

  if(live){
    const showName=escapeHtml(nowPlayingShow);
    setNowPlayingCardSlotHtml(`<div id="now-playing-card" data-state="live" data-show-name="${showName}">
      <div class="now-playing-poster-wrap now-playing-vcr-wrap">
        <img class="now-playing-poster" data-show-key="now-playing:live" src="" alt="" />
        <div class="now-playing-vcr-scanlines" aria-hidden="true"></div>
        <div class="now-playing-vcr-chroma" aria-hidden="true"></div>
        <canvas class="now-playing-poster-overlay-canvas" aria-hidden="true"></canvas>
        <span class="now-playing-live-dot" aria-hidden="true"></span>
      </div>
      <div class="now-playing-title">${showName}</div>
    </div>`);
    initNowPlayingPosterOverlay();
    void resolveNowPlayingPoster(nowPlayingShow);
    return;
  }

  if(shuffleActive){
    const showName=escapeHtml(nowPlayingShuffleShow);
    setNowPlayingCardSlotHtml(`<div id="now-playing-card" data-state="shuffle" data-show-name="${showName}">
      <div class="now-playing-poster-wrap now-playing-poster-wrap--launch now-playing-vcr-wrap">
        <img class="now-playing-poster" data-show-key="now-playing:shuffle" src="" alt="" />
        <div class="now-playing-vcr-scanlines" aria-hidden="true"></div>
        <div class="now-playing-vcr-chroma" aria-hidden="true"></div>
        <canvas class="now-playing-poster-overlay-canvas" aria-hidden="true"></canvas>
      </div>
      <div class="now-playing-title">${showName}</div>
    </div>`);
    initNowPlayingPosterOverlay();
    void resolveNowPlayingPoster(nowPlayingShuffleShow,'now-playing:shuffle');
    return;
  }

  setNowPlayingCardSlotHtml(`<div id="now-playing-card" data-state="no-signal">
    <div class="now-playing-poster-wrap now-playing-vcr-wrap">
      <canvas class="now-playing-static-canvas" aria-hidden="true"></canvas>
      <div class="now-playing-vcr-scanlines" aria-hidden="true"></div>
      <div class="now-playing-vcr-chroma" aria-hidden="true"></div>
      <div class="now-playing-no-signal-text"><span class="now-playing-no-signal-label">NO SIGNAL</span></div>
    </div>
  </div>`);
  const canvas=document.querySelector('#now-playing-card-slot .now-playing-static-canvas');
  if(canvas){
    canvas.width=canvas.offsetWidth||166;
    canvas.height=canvas.offsetHeight||100;
    startNowPlayingStatic(canvas);
  }
}

function initNowPlayingCard(){
  ensureNowPlayingCardHost();
  installNowPlayingShufflePosterClick();
  renderNowPlayingCard();
  if(!window.__shufflrNowPlayingInterval){
    window.__shufflrNowPlayingInterval=setInterval(renderNowPlayingCard,5000);
  }
}

function installNowPlayingCardListener(){
  window.addEventListener('message',(event)=>{
    if(event.source!==window)return;
    if(event.data?.source!=='shufflr-extension')return;
    if(event.data?.type!=='SHUFFLR_NOW_PLAYING')return;
    console.log('[Shufflr] Received now-playing:', event.data.payload);
    nowPlayingShow=event.data.payload?.showName||null;
    nowPlayingLastSeen=event.data.payload?.timestamp||Date.now();
    renderNowPlayingCard();
  });
}

function ensureFloatingDownloadButton(){
  if(document.getElementById('sidebar-download-btn'))return;
  const btn=document.createElement('button');
  btn.type='button';
  btn.id='sidebar-download-btn';
  btn.className='shufflr-download-float-btn';
  btn.textContent='DOWNLOAD';
  document.body.appendChild(btn);
}

installNowPlayingCardListener();
initNowPlayingCard();
ensureFloatingDownloadButton();

function getShowPosterPathFromShow(show){
  return show?.poster_path||show?.posterPath||show?.showPoster||show?.poster||show?.image||'';
}

function getPosterLookupKey(show){
  return getHomeShowDedupeKey(show)||getRecentlyWatchedPosterKey(stripServiceSuffixFromShowName(getShowLabel(show)));
}

function getPlaylistCoverShows(playlist){
  const shows=playlist?.shows||[];
  if(!shows.length)return[];
  if(shows.length===1)return[shows[0]];
  const slots=[...shows.slice(0,4)];
  while(slots.length<4)slots.push(shows[0]);
  return slots;
}

function buildPlaylistGridQuadrantHtml(show,playlistIndex,quadrantIndex){
  const showKey=`pl-cover:${playlistIndex}:${quadrantIndex}`;
  const posterUrl=buildPosterUrl(getShowPosterPathFromShow(show),'w185');
  if(posterUrl){
    return `<img data-show-key="${escapeHtml(showKey)}" src="${posterUrl}" alt="" onerror="this.style.background='#1a1a1a'" />`;
  }
  return `<img data-show-key="${escapeHtml(showKey)}" src="" alt="" style="opacity:0;background:#1a1a1a;" />`;
}

function buildPlaylistCoverPosterHtml(playlist,playlistIndex){
  const customPoster=localStorage.getItem('shufflr_playlist_poster_'+(playlist.id||playlist.name));
  if(customPoster){
    return `<img src="${customPoster}" style="width:100%;height:100%;object-fit:cover;border-radius:8px 8px 0 0;">`;
  }
  const shows=playlist.shows||[];
  if(!shows.length){
    return `<div class="pl-poster-placeholder">
      ${YOUR_SHOWS_SMILEY_SVG}
    </div>`;
  }
  if(shows.length===1){
    const show=shows[0];
    const showKey=`pl-cover:${playlistIndex}:0`;
    const posterUrl=buildPosterUrl(getShowPosterPathFromShow(show),'w185');
    if(posterUrl){
      return `<img data-show-key="${escapeHtml(showKey)}" src="${posterUrl}" onerror="this.style.background='#1a1a1a'" style="width:100%;height:100%;object-fit:cover;" />`;
    }
    return buildDeferredPosterHtml(showKey,'','width:100%;height:100%;object-fit:cover;');
  }
  const coverShows=getPlaylistCoverShows(playlist);
  return `<div class="pl-cover-grid">${coverShows.map((show,qi)=>(
    `<div class="pl-cover-grid-cell">${buildPlaylistGridQuadrantHtml(show,playlistIndex,qi)}</div>`
  )).join('')}</div>`;
}

async function resolvePlaylistCardPosters(allPlaylists,filtered){
  const lookupMap=new Map();
  for(const playlist of (filtered||[])){
    const index=allPlaylists.indexOf(playlist);
    if(index<0)continue;
    if(localStorage.getItem('shufflr_playlist_poster_'+(playlist.id||playlist.name)))continue;
    const coverShows=getPlaylistCoverShows(playlist);
    if(!coverShows.length)continue;
    coverShows.forEach((show,qi)=>{
      if(buildPosterUrl(getShowPosterPathFromShow(show),'w185'))return;
      const showKey=`pl-cover:${index}:${qi}`;
      const query=stripServiceSuffixFromShowName(getShowLabel(show));
      if(!query)return;
      lookupMap.set(showKey,query);
    });
  }
  await resolveCardPostersFromTmdb(lookupMap,'w185');
}

function buildDrawerShowThumbnailHtml(show){
  const showKey=getPosterLookupKey(show);
  const posterUrl=buildPosterUrl(getShowPosterPathFromShow(show),'w92');
  const imgStyle='width:28px;height:40px;object-fit:cover;border-radius:3px;margin-right:8px;flex-shrink:0;background:#222;';
  if(posterUrl){
    return `<img class="pl-drawer-add-poster" data-show-key="${escapeHtml(showKey)}" src="${posterUrl}" alt="" style="${imgStyle}" onerror="this.style.background='#222'" />`;
  }
  return `<img class="pl-drawer-add-poster" data-show-key="${escapeHtml(showKey)}" src="" alt="" style="${imgStyle}opacity:0;" />`;
}

async function resolveDrawerShowPosters(shows){
  const lookupMap=new Map();
  for(const show of (shows||[])){
    if(buildPosterUrl(getShowPosterPathFromShow(show),'w92'))continue;
    const showKey=getPosterLookupKey(show);
    const query=stripServiceSuffixFromShowName(getShowLabel(show));
    if(!showKey||!query)continue;
    lookupMap.set(showKey,query);
  }
  await resolveCardPostersFromTmdb(lookupMap,'w92');
}

function buildPlRowPosterHtml(item,pi,index,kind){
  const showKey=`pl-row:${kind}:${pi}:${index}`;
  const path=kind==='show'?getShowPosterPathFromShow(item):item.showPoster;
  const posterUrl=buildPosterUrl(path,'w92');
  const epStyle=kind==='ep'?' style="opacity:0.75;"':'';
  const emptyStyle=kind==='ep'?' style="opacity:0.75;background:#1a1a1a;"':' style="background:#1a1a1a;"';
  if(posterUrl){
    return `<img class="pl-show-img" data-show-key="${escapeHtml(showKey)}" src="${posterUrl}" onerror="this.style.background='#1a1a1a'"${epStyle} />`;
  }
  return `<img class="pl-show-img" data-show-key="${escapeHtml(showKey)}" src="" onerror="this.style.background='#1a1a1a'"${emptyStyle} />`;
}

async function resolvePlaylistRowPosters(sourcePlaylists){
  const lookupMap=new Map();
  (sourcePlaylists||playlists).forEach((p,pi)=>{
    (p.shows||[]).forEach((show,si)=>{
      if(buildPosterUrl(getShowPosterPathFromShow(show),'w92'))return;
      const showKey=`pl-row:show:${pi}:${si}`;
      const query=stripServiceSuffixFromShowName(getShowLabel(show));
      if(!showKey||!query)return;
      lookupMap.set(showKey,query);
    });
    (p.episodes||[]).forEach((ep,ei)=>{
      if(buildPosterUrl(ep.showPoster,'w92'))return;
      const showKey=`pl-row:ep:${pi}:${ei}`;
      const query=stripServiceSuffixFromShowName(ep.showName||'');
      if(!showKey||!query)return;
      lookupMap.set(showKey,query);
    });
  });
  await resolveCardPostersFromTmdb(lookupMap,'w92');
}

function buildYourShowsSectionHtml(section){
  const items=section.items||[];
  let html=`<div class="genre-section your-shows-section" style="margin-top:16px;"><div class="genre-title">${t('section.yourShows')}</div>`;
  if(!items.length){
    html+=`<div class="pl-empty-state pl-empty-state--visual">${buildHomeEmptyTvIconHtml()}<p class="home-empty-title">${t('empty.noYourShowsTitle')}</p><p class="home-empty-desc">${t('empty.noYourShowsHint')}</p></div></div>`;
    return html;
  }
  html+=`<div class="h-scroll-wrap">`;
  items.forEach(({show:s,playlistIndex:pi,showIndex:si})=>{
    const showKey=getHomeShowDedupeKey(s);
    html+=`<div class="ep-card-h your-show-card" data-show-playlist-index="${pi}" data-show-index="${si}">
      ${buildYourShowsPosterHtml(s,showKey)}
      <div class="ep-card-h-body">
        <div class="ep-card-h-name">${s.name||s.title||''}</div>
      </div>
    </div>`;
  });
  html+=`</div><div id="your-show-popup" class="your-show-popup" hidden></div></div>`;
  return html;
}

function formatRelativeWatchTime(watchedAt) {
  if (!watchedAt) return '';
  const then = new Date(watchedAt).getTime();
  if (Number.isNaN(then)) return '';
  const diffMs = Date.now() - then;
  if (diffMs < 0) return 'just now';
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} minute${min !== 1 ? 's' : ''} ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hour${hr !== 1 ? 's' : ''} ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day} day${day !== 1 ? 's' : ''} ago`;
  const week = Math.floor(day / 7);
  if (week < 5) return `${week} week${week !== 1 ? 's' : ''} ago`;
  return new Date(watchedAt).toLocaleDateString();
}

function dedupeWatchHistoryByShowId(entries) {
  const seen = new Set();
  return (entries || []).filter(entry => {
    const key = String(entry.show_id ?? '');
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function formatRecentlyWatchedEpisodeLabel(entry) {
  const name = (entry.episode_name || '').trim();
  const epNum = entry.episode_number;
  if (epNum != null && name) return `E${epNum}: ${name}`;
  if (epNum != null) return `Episode ${epNum}`;
  if (name) return name;
  return '';
}

async function fetchTmdbEpisodeOverview(showId, seasonNum, episodeNumber) {
  if (!/^\d+$/.test(String(showId))) return null;
  const season = Number(seasonNum);
  const episode = Number(episodeNumber);
  if (!Number.isFinite(season) || !Number.isFinite(episode)) return null;
  try {
    const r = await fetch(
      `https://api.themoviedb.org/3/tv/${showId}/season/${season}/episode/${episode}?api_key=${KEY}&language=en-US`
    );
    if (!r.ok) return null;
    const data = await r.json();
    const overview = (data.overview || '').trim();
    return overview || null;
  } catch {
    return null;
  }
}

function getRecentlyWatchedMaxUrlFromEntry(entry){
  const stored=entry?.max_url||entry?.maxUrl||entry?.url||'';
  if(stored&&String(stored).includes('max.com'))return String(stored);
  const showId=entry?.show_id!=null?String(entry.show_id):'';
  if(showId&&!/^\d+$/.test(showId)){
    return `https://play.max.com/show/${showId}`;
  }
  return '';
}

function getRecentlyWatchedLaunchUrl(showId,showName,maxUrl){
  if(maxUrl&&String(maxUrl).includes('max.com'))return maxUrl;
  const normId=String(showId||'').trim();
  const name=stripServiceSuffixFromShowName(showName);
  if(normId&&!/^\d+$/.test(normId)){
    return `https://play.max.com/show/${normId}`;
  }
  if(name){
    return `https://play.max.com/search?q=${encodeURIComponent(name)}`;
  }
  return null;
}

async function resolveShowForRecentlyWatchedClick(showId, showName) {
  const storedPlaylists = await readPlaylistsFromChromeStorage();
  const allPlaylists = storedPlaylists || playlists || [];
  const normId = String(showId || '').trim();
  const normName = normalizePlShowName(showName);

  for (const playlist of allPlaylists) {
    for (const show of playlist?.shows || []) {
      const maxId = getShowMaxId(show);
      if (maxId && normId && String(maxId).toLowerCase() === normId.toLowerCase()) return show;
      if (show.id != null && normId && String(show.id) === normId) return show;
      const label = normalizePlShowName(getPlaylistShowLabel(show));
      if (normName && label && normName === label) return show;
    }
  }

  const fallback = { name: showName, title: showName };
  if (normId && !/^\d+$/.test(normId)) fallback.maxId = normId;
  else if (normId && /^\d+$/.test(normId)) fallback.id = normId;
  return fallback;
}

function buildRecentlyWatchedMaxCardHtml(entry, description) {
  const posterUrl = buildPosterUrl(entry.poster_path, 'w300');
  const rawShowName = stripServiceSuffixFromShowName(entry.show_name);
  const showTitle = escapeHtml(formatRecentlyWatchedCardTitle(entry));
  const episodeLabel = escapeHtml(formatRecentlyWatchedEpisodeLabel(entry));
  const time = escapeHtml(formatRelativeWatchTime(entry.watched_at));
  const showId = entry.show_id != null ? String(entry.show_id) : '';
  const showIdAttr = encodeURIComponent(showId);
  const showNameAttr = encodeURIComponent(rawShowName);
  const maxUrlAttr = encodeURIComponent(getRecentlyWatchedMaxUrlFromEntry(entry));
  const showKey = getRecentlyWatchedPosterKey(rawShowName);
  const thumbHtml = buildDeferredPosterHtml(
    showKey,
    posterUrl,
    'width:100%;height:100%;object-fit:cover;background:#1a1a1a;pointer-events:none;'
  );
  const descHtml = description
    ? `<div class="ep-card-h-meta" style="margin-top:6px;color:var(--text);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;line-height:1.35;pointer-events:none;">${escapeHtml(description)}</div>`
    : '';
  return `<div class="ep-card-h recently-watched-card" data-recently-watched-show-id="${showIdAttr}" data-recently-watched-show-name="${showNameAttr}" data-recently-watched-max-url="${maxUrlAttr}" style="width:240px;">
    <div class="recently-watched-card-thumb" style="width:100%;aspect-ratio:16/9;background:#1a1a1a;overflow:hidden;flex-shrink:0;pointer-events:none;">${thumbHtml}</div>
    <div class="ep-card-h-body" style="pointer-events:none;">
      <div class="ep-card-h-name" style="pointer-events:none;">${showTitle}</div>
      ${episodeLabel ? `<div class="ep-card-h-code" style="pointer-events:none;">${episodeLabel}</div>` : ''}
      <div class="ep-card-h-meta" style="pointer-events:none;">${time}</div>
      ${descHtml}
    </div>
  </div>`;
}

async function buildRecentlyWatchedMaxCardsHtml(entries) {
  const cards = await Promise.all((entries || []).map(async entry => {
    const description = await fetchTmdbEpisodeOverview(
      entry.show_id,
      entry.season_num,
      entry.episode_number
    );
    return buildRecentlyWatchedMaxCardHtml(entry, description);
  }));
  return cards.join('');
}

function getPlaylistsFromBridge() {
  return new Promise((resolve) => {
    // If bridge has already exposed playlists on window, use them
    if (window.shufflrPlaylists && Array.isArray(window.shufflrPlaylists)) {
      return resolve(window.shufflrPlaylists);
    }

    // Otherwise, send a message to the bridge and wait for the response
    const handler = (event) => {
      if (event.source !== window) return;
      if (event.data && event.data.type === 'SHUFFLR_PLAYLISTS_RESPONSE') {
        window.removeEventListener('message', handler);
        resolve(event.data.playlists || []);
      }
    };
    window.addEventListener('message', handler);

    // Request playlists from the bridge
    window.postMessage({ type: 'SHUFFLR_GET_PLAYLISTS' }, '*');

    // Timeout after 2 seconds in case bridge isn't connected
    setTimeout(() => {
      window.removeEventListener('message', handler);
      resolve([]);
    }, 2000);
  });
}

function stopHomeEmptyStatic(){
  if(homeEmptyStaticAnimId){
    cancelAnimationFrame(homeEmptyStaticAnimId);
    homeEmptyStaticAnimId=null;
  }
}

function startHomeEmptyStatic(canvas){
  stopHomeEmptyStatic();
  if(!canvas)return;
  const ctx=canvas.getContext('2d');
  if(!ctx)return;
  const w=canvas.width;
  const h=canvas.height;
  function draw(){
    const imageData=ctx.createImageData(w,h);
    const data=imageData.data;
    for(let i=0;i<data.length;i+=4){
      const spike=Math.random()<0.1;
      const v=spike?(55+Math.random()*45|0):(Math.random()*32|0);
      data[i]=v;
      data[i+1]=v;
      data[i+2]=v;
      data[i+3]=255;
    }
    ctx.putImageData(imageData,0,0);
    homeEmptyStaticAnimId=requestAnimationFrame(draw);
  }
  draw();
}

function initHomeEmptyStatic(){
  const canvas=document.querySelector('.home-empty-static-canvas');
  if(!canvas)return;
  const wrap=canvas.closest('.home-empty-static-wrap');
  canvas.width=wrap?.offsetWidth||104;
  canvas.height=wrap?.offsetHeight||68;
  startHomeEmptyStatic(canvas);
}

function buildHomeEmptyStaticHtml(){
  return `<div class="home-empty-static-wrap" aria-hidden="true"><canvas class="home-empty-static-canvas"></canvas></div>`;
}

function buildHomeEmptyTvIconHtml(){
  return `<div class="home-empty-tv-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="84" height="84" fill="none" stroke="#23A8E0" stroke-width="3" stroke-linecap="square" stroke-linejoin="miter">
  <!-- Screen/body outer rectangle -->
  <rect x="18" y="22" width="64" height="48" rx="0"/>
  <!-- Left eye -->
  <rect x="31" y="35" width="8" height="8" fill="#23A8E0" stroke="none"/>
  <!-- Right eye -->
  <rect x="61" y="35" width="8" height="8" fill="#23A8E0" stroke="none"/>
  <!-- Mouth -->
  <line x1="35" y1="54" x2="65" y2="54"/>
  <!-- Stand neck -->
  <line x1="50" y1="70" x2="50" y2="75"/>
  <!-- Stand base -->
  <line x1="36" y1="75" x2="64" y2="75"/>
</svg></div>`;
}

function buildHomeEmptyVhsIconHtml(){
  return `<div class="home-empty-tv-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 80" width="70" height="56" fill="none" stroke="#23A8E0" stroke-width="2.5" stroke-linecap="square" stroke-linejoin="miter">
  <!-- Main board body -->
  <rect x="5" y="28" width="90" height="47"/>
  <!-- Top clapper strip -->
  <rect x="5" y="14" width="90" height="16"/>
  <!-- Clapper diagonal stripes (alternating filled) -->
  <line x1="20" y1="14" x2="14" y2="30"/>
  <line x1="34" y1="14" x2="28" y2="30"/>
  <line x1="48" y1="14" x2="42" y2="30"/>
  <line x1="62" y1="14" x2="56" y2="30"/>
  <line x1="76" y1="14" x2="70" y2="30"/>
  <line x1="90" y1="14" x2="84" y2="30"/>
  <!-- Hinge line on left -->
  <line x1="5" y1="14" x2="18" y2="5"/>
  <line x1="22" y1="14" x2="35" y2="5"/>
  <!-- Top clapper arm (angled open) -->
  <polygon points="5,14 95,14 95,5 5,5" stroke="#23A8E0"/>
</svg></div>`;
}

// Builds the "Your Playlists" horizontal scroll row filtered by the connected streaming service.
async function buildYourPlaylistsHtml() {
  const connectedService = localStorage.getItem('shufflr_service') || 'max';
  const bridgePlaylists = await getPlaylistsFromBridge();
  const allPlaylists = bridgePlaylists || playlists || [];
  homePlaylistsCache = allPlaylists;
  const displayPlaylists = allPlaylists.filter(p => (p.service || 'max') === connectedService);
  if (!displayPlaylists.length) {
    return `
    <div class="genre-section" style="margin-top:16px;">
      <div class="genre-title">${t('section.yourPlaylists')}</div>
      <div class="pl-empty-state pl-empty-state--visual">${buildHomeEmptyStaticHtml()}<p class="home-empty-title">${t('empty.noPlaylists')}</p><p class="home-empty-desc">${t('empty.noPlaylistsHint')}</p></div>
    </div>`;
  }

  const cards = displayPlaylists.map((playlist) => {
    const index = allPlaylists.indexOf(playlist);
    const playlistItems = playlist.shows || [];
    const itemCount = playlistItems.length;
    const countLabel = `${itemCount} ${itemCount !== 1 ? t('pl.shows') : t('pl.show')}`;
    const posterHtml = buildPlaylistCoverPosterHtml(playlist, index);

    return `
      <div class="pl-home-card" data-pl-index="${index}" data-pl-id="${playlist.id || ''}" data-pl-name="${encodeURIComponent(playlist.name || '')}">
        <div class="pl-home-poster" onclick="togglePlaylistDrawer(${index})">
          ${posterHtml}
          <button class="pl-home-camera-btn" onclick="event.stopPropagation();triggerPlaylistPosterPicker('${playlist.id || playlist.name}')" aria-label="Change playlist poster">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="1" y="4" width="14" height="10" rx="1" stroke="white" stroke-width="1.5" fill="none"/>
              <circle cx="8" cy="9" r="2.5" stroke="white" stroke-width="1.5" fill="none"/>
              <rect x="5" y="2" width="6" height="2" rx="1" fill="white"/>
            </svg>
          </button>
        </div>
        <div class="pl-home-info" onclick="togglePlaylistDrawer(${index})">
          <div class="pl-home-name">${playlist.name || 'Untitled'}</div>
          <div class="pl-home-count">${countLabel}</div>
        </div>
      </div>`;
  }).join('');

  return `
    <div class="genre-section pl-home-section" style="margin-top:16px;">
      <div class="genre-title">${t('section.yourPlaylists')}</div>
      <div class="h-scroll-wrap">${cards}</div>
      <div class="pl-home-drawer" id="pl-home-drawer" hidden></div>
    </div>`;
}

async function buildRecentlyWatchedOnMaxHtml(entries){
  let html=`<div class="genre-section" style="margin-top:16px;"><div class="genre-title">${t('section.recentlyWatched')}</div>`;
  if(!entries?.length){
    html+=`<div class="pl-empty-state pl-empty-state--visual">${buildHomeEmptyVhsIconHtml()}<p class="home-empty-title">${t('empty.noRecentlyWatchedTitle')}</p><p class="home-empty-desc">${t('empty.noRecentlyWatched')}</p></div></div>`;
    return html;
  }
  html+=`<div class="h-scroll-wrap">${await buildRecentlyWatchedMaxCardsHtml(entries)}</div></div>`;
  return html;
}

async function loadRecentlyWatchedOnMaxSection(allPlaylists=playlists){
  if(typeof window.shufflrGetWatchHistory!=='function')return{html:await buildRecentlyWatchedOnMaxHtml([]),entries:[]};
  try{
    const entries=dedupeWatchHistoryByShowId(await window.shufflrGetWatchHistory(200));
    return{html:await buildRecentlyWatchedOnMaxHtml(entries),entries};
  }catch(e){
    console.error('[Shufflr] Failed to load watch history:',e);
    return{html:await buildRecentlyWatchedOnMaxHtml([]),entries:[]};
  }
}

function savePlaylists(){
  localStorage.setItem(SHUFFLR_PLAYLISTS_KEY,JSON.stringify(playlists));
  window.dispatchEvent(new CustomEvent('shufflr-playlists-sync',{detail:playlists}));
  window.postMessage({type:'SHUFFLR_SYNC_PLAYLISTS',source:'shufflr-web',playlists},'*');
  try{
    if(typeof chrome!=='undefined'&&chrome.storage&&chrome.storage.local){
      chrome.storage.local.set({[SHUFFLR_PLAYLISTS_KEY]:playlists});
    }
  }catch(e){}
  if(typeof window.shufflrSyncPlaylistsToCloud==='function'){
    window.shufflrSyncPlaylistsToCloud(playlists);
  }
}
let highlightedEps=[];
let cameFromFree=false,freeScrollPos=0;
let lastShowNav={shows:null,movies:null};
let homeNavType='shows',homeScrollPos=0;
let _timerInterval=null,_timerSecondsLeft=0,_timerTotalSeconds=0;
let _timerEp=null,_timerNextEp=null;
let _timerStartTimestamp=null,_timerPhase=null;
let _timerBufferSecs=10,_timerRuntimeSecs=60,_timerNotifAt=10;
let _timerNotifScheduled=false,_timerNotifTimeout=null;

// LOADING
window.addEventListener('load',()=>{
  detectRegion();
  setTimeout(()=>{
    const ls=document.getElementById('loading-screen');
    ls.style.transition='opacity 0.5s';ls.style.opacity='0';
    setTimeout(()=>{
      ls.style.display='none';
      if(!localStorage.getItem('shufflr_onboarded')) document.getElementById('onboarding').style.display='flex';
      applyStaticTranslations();
      updateConnectBtnLabel();
      updateTopbarAuthZone();
      maybeAutoOpenTopbarSigninCard();
      renderHomeScreen('shows');
      // Ask for notification permission on load (like a normal app)
      askNotifPermissionOnLoad();
    },500);
  },2200);
});

// KEYBOARD SHORTCUT
document.addEventListener('keydown',e=>{
  if(e.code==='Space'&&e.target.tagName!=='INPUT'){e.preventDefault();triggerShuffle();}
  if(e.code==='KeyS'&&e.target.tagName!=='INPUT'&&currentNav==='shows'){document.getElementById('search-input').focus();}
});

// ONBOARDING
let obIndex=0;
function nextOnboard(){
  obIndex++;
  if(obIndex>=getObSteps().length){closeHelp();localStorage.setItem('shufflr_onboarded','1');return;}
  const s=getObSteps()[obIndex];
  document.getElementById('ob-step').textContent=s.step;
  document.getElementById('ob-title').textContent=s.title;
  document.getElementById('ob-desc').textContent=s.desc;
  document.querySelectorAll('.onboard-dot').forEach((d,i)=>d.classList.toggle('active',i===obIndex));
  if(s.picker){
    document.getElementById('ob-desc').innerHTML=s.desc;
    document.getElementById('ob-service-picker').style.display='grid';
    document.querySelector('.onboard-btn').textContent=t('btn.done');
    // pre-select saved
    const saved=localStorage.getItem('shufflr_service')||'netflix';
    document.querySelectorAll('.ob-service-btn').forEach(b=>b.classList.toggle('selected',b.dataset.svc===saved));
  } else {
    document.getElementById('ob-service-picker').style.display='none';
    if(obIndex===getObSteps().length-2) document.querySelector('.onboard-btn').textContent=t('btn.next');
  }
}
function pickObService(el, svc){
  localStorage.setItem('shufflr_service', svc);
  document.querySelectorAll('.ob-service-btn').forEach(b=>b.classList.remove('selected'));
  el.classList.add('selected');
}

// THEME
function toggleTheme(){
  isLightMode=!isLightMode;
  document.body.classList.toggle('light-mode',isLightMode);
  document.getElementById('theme-btn').textContent=t(isLightMode?'theme.light':'theme.dark');
}

// CONNECT
function openConnect(){
  // Restore saved selection
  const saved=localStorage.getItem('shufflr_service');
  document.querySelectorAll('#service-list .service-connect-btn').forEach(b=>{
    const svc=b.closest('.service-row').dataset.svc;
    if(svc===saved){b.textContent=t('connect.connected');b.classList.add('connected');}
    else{b.textContent=t('connect.connect');b.classList.remove('connected');}
  });
  document.getElementById('connect-modal').classList.add('open');
}
function closeConnect(){document.getElementById('connect-modal').classList.remove('open');}
function selectService(btn, svc){
  // Deselect all
  document.querySelectorAll('#service-list .service-connect-btn').forEach(b=>{
    b.textContent=t('connect.connect');b.classList.remove('connected');
  });
  // Select this one
  localStorage.setItem('shufflr_service', svc);
  btn.textContent=t('connect.connected');
  btn.classList.add('connected');
  // Update sidebar button label
  updateConnectBtnLabel();
}
function updateConnectBtnLabel(){
  const saved=localStorage.getItem('shufflr_service');
  const names={netflix:'Netflix',max:'Max',hulu:'Hulu',disney:'Disney+',prime:'Prime Video',tubi:'Tubi',peacock:'Peacock',paramount:'Paramount+',appletv:'Apple TV+',crunchyroll:'Crunchyroll'};
  const btn=document.getElementById('service-connect-btn');
  if(!btn) return;
  if(saved&&names[saved]){
    btn.innerHTML=`<span class="shufflr-status-dot" aria-hidden="true"></span>${names[saved]} ${t('connect.connected')}`;
  } else {
    btn.innerHTML=t('connect.connectYourService');
  }
  btn.style.borderColor='';
  btn.style.color='';
  btn.style.boxShadow='';
}

function updateSeasonsSidebarVisibility(hasSeasons){
  const block=document.getElementById('seasons-sidebar-block');
  if(block)block.style.display=hasSeasons?'':'none';
}

function clearSeasonsSidebar(){
  document.getElementById('seasons-list').innerHTML='';
  updateSeasonsSidebarVisibility(false);
}

// NAV
function setNav(nav){
  if(nav==='movies'||nav==='free')return;
  if(nav!=='playlist')expandedPlaylistIndex=null;
  currentNav=nav;
  ['shows','playlist','options'].forEach(n=>{
    const el=document.getElementById('nav-'+n);
    if(el) el.classList.toggle('active',n===nav);
  });
  if(nav==='playlist'){
    allSeasons=[];
    clearSeasonsSidebar();
    renderPlaylistPage();
  }else if(nav==='options'){
    allSeasons=[];
    clearSeasonsSidebar();
    renderOptionsPage();
  }else if(nav==='shows'){
    currentType='tv';
    currentShow=null; allSeasons=[]; allEpisodes={}; highlightedEps=[];
    clearSeasonsSidebar();
    document.getElementById('search-input').value='';
    homeScrollPos=0;
    lastShowNav={shows:null,movies:null};
    renderHomeScreen('shows');
  }
  ensureTopbarAuthZonePosition();
}

function _restoreShow(show,type){
  currentType=type;
  document.getElementById('search-input').value=show.name||show.title||'';
  currentShow=show;
  if(type==='tv') loadSeasons(show.id);
  else renderMovieMain(show);
}

// SEARCH
function handleSearch(){
  const q=document.getElementById('search-input').value.trim();
  const drop=document.getElementById('dropdown');
  clearTimeout(searchTimer);
  if(!q){showRecent();return;}
  searchTimer=setTimeout(()=>doSearch(q),350);
}

function showRecent(){
  const drop=document.getElementById('dropdown');
  if(document.getElementById('search-input').value.trim()){return;}
  const filtered=recentShows.filter(s=>!s.release_date);
  if(!filtered.length){drop.classList.remove('open');return;}
  drop.innerHTML='<div class="recent-label">'+t('search.recentLabel')+'</div>'+
    filtered.slice(0,5).map((s,i)=>`
      <div class="recent-item" onclick="selectRecent(${recentShows.indexOf(s)})">
        <img class="recent-img" src="${s.poster_path?IMG+'w92'+s.poster_path:''}" onerror="this.style.background='#1a1a1a'" />
        <span>${s.name||s.title}</span>
      </div>`).join('');
  openDropdown();
}

async function doSearch(q){
  const type='tv';
  try{
    const r=await fetch(`https://api.themoviedb.org/3/search/${type}?api_key=${KEY}&query=${encodeURIComponent(q)}`);
    const d=await r.json();
    const results=(d.results||[]).slice(0,7);
    const drop=document.getElementById('dropdown');
    if(!results.length){drop.classList.remove('open');return;}
    drop._results=results;
    drop.innerHTML=results.map((s,i)=>`
      <div class="result-item" onclick="selectShow(${i})">
        <img class="result-img" src="${s.poster_path?IMG+'w92'+s.poster_path:''}" onerror="this.style.background='#1a1a1a'" />
        <div><div class="result-name">${s.name||s.title}</div>
        <div class="result-year">${((s.first_air_date||s.release_date)||'').slice(0,4)} | ${s.vote_average?s.vote_average.toFixed(1)+'/10':'N/A'}</div></div>
      </div>`).join('');
    openDropdown();
  }catch(e){console.error(e);}
}

async function selectShow(i){
  const drop=document.getElementById('dropdown');
  const show=drop._results[i];
  closeSearch();
  _loadShow(show);
}

function selectRecent(i){_loadShow(recentShows[i]);}

async function _loadShow(show){
  document.getElementById('search-input').value=show.name||show.title||'';
  document.getElementById('dropdown').classList.remove('open');
  currentShow=show;
  blockedSeasons=new Set();selectedSeason=null;allEpisodes={};highlightedEps=[];
  recentShows=[show,...recentShows.filter(s=>s.id!==show.id)].slice(0,10);
  localStorage.setItem('shufflr_recent',JSON.stringify(recentShows));
  if(show.media_type==='movie'||show.release_date){
    currentType='movie';
    lastShowNav.movies=show;
    renderMovieMain(show);
  } else {
    currentType='tv';
    lastShowNav.shows=show;
    await loadSeasons(show.id);
  }
}

// SEASONS
async function loadSeasons(id){
  showMain('<div class="empty-state"><div class="empty-title" style="animation:blink 0.8s infinite">'+t('empty.loading')+'</div></div>');
  try{
    const r=await fetch(`https://api.themoviedb.org/3/tv/${id}?api_key=${KEY}`);
    const d=await r.json();
    allSeasons=(d.seasons||[]).filter(s=>s.season_number>0&&s.episode_count>0);
    currentShow={...currentShow,...d};
    renderSeasonsSidebar();
    await renderMain();

  }catch(e){console.error(e);}
}

function renderSeasonsSidebar(){
  const el=document.getElementById('seasons-list');
  if(!allSeasons.length){
    clearSeasonsSidebar();
    return;
  }
  updateSeasonsSidebarVisibility(true);
  el.innerHTML=allSeasons.map(s=>`
    <div class="season-item ${selectedSeason===s.season_number?'active':''} ${blockedSeasons.has(s.season_number)?'blocked':''}"
         onclick="selectSeason(${s.season_number})">
      <div class="nav-dot"></div>
      S${String(s.season_number).padStart(2,'0')}
      <button class="block-btn" onclick="toggleBlock(event,${s.season_number})" title="Block season">✕</button>
    </div>`).join('');
}

function toggleBlock(e,num){
  e.stopPropagation();
  if(blockedSeasons.has(num))blockedSeasons.delete(num);
  else{blockedSeasons.add(num);if(selectedSeason===num)selectedSeason=null;}
  renderSeasonsSidebar();renderMain();
}

async function selectSeason(num){
  if(blockedSeasons.has(num))return;
  selectedSeason=selectedSeason===num?null:num;
  renderSeasonsSidebar();await renderMain();
}

// RATING
function getRatingHTML(){
  return `<div class="rating-bar">
    <div class="rating-top">
      <span class="rating-title">Min Rating</span>
      <span class="rating-value" id="rating-display">${minRating===0?'ANY':minRating.toFixed(1)+'+'}</span>
    </div>
    <input type="range" id="rating-slider" min="0" max="10" step="0.1" value="${minRating}"
      oninput="updateRating(this.value)" style="--pct:${minRating*10}%" />
    <div class="slider-labels"><span>Any</span><span>2</span><span>4</span><span>6</span><span>8</span><span>10</span></div>
  </div>`;
}

function updateRating(val){
  minRating=parseFloat(val);
  const s=document.getElementById('rating-slider');
  if(s)s.style.setProperty('--pct',(minRating*10)+'%');
  const d=document.getElementById('rating-display');
  if(d)d.textContent=minRating===0?'ANY':minRating.toFixed(1)+'+';
  // Filter compact episode rows live
  document.querySelectorAll('.ep-compact[data-rating]').forEach(row=>{
    const show=minRating===0||(parseInt(row.dataset.votes||0)>=3&&parseFloat(row.dataset.rating)>=minRating);
    row.style.display=show?'':'none';
  });
  // Also filter legacy ep-row elements if any
  document.querySelectorAll('.ep-row[data-rating]').forEach(row=>{
    const show=minRating===0||(parseInt(row.dataset.votes||0)>=3&&parseFloat(row.dataset.rating)>=minRating);
    row.style.display=show?'':'none';
  });
  // Hide entire season blocks if all their episodes are hidden
  document.querySelectorAll('.ep-season-block').forEach(block=>{
    const anyVisible=Array.from(block.querySelectorAll('.ep-compact[data-rating], .ep-row[data-rating]')).some(r=>r.style.display!=='none');
    block.style.display=anyVisible?'':'none';
  });
}

// PRESS & PLAY
function pressAndPlay(){
  const url=getEpLink();
  window.open(url,'_blank');
  // If queue exists, start timer for episode #1
  if(highlightedEps.length){
    const ep=highlightedEps[0];
    _timerEp={
      name:ep.name||'Episode',
      code:`S${String(ep.seasonNum||'').padStart(2,'0')} E${String(ep.episode_number||'').padStart(2,'0')}`,
      runtime:ep.runtime||45,
    };
    _timerNextEp=highlightedEps.length>1?highlightedEps[1]:getNextEpisode(ep);
    // TEST MODE: 10s buffer, 60s runtime
    const runtimeSecs=60;
    startTimerPhase1(runtimeSecs);
  }
}

// SHUFFLE
function triggerShuffle(){
  if(!currentShow||currentNav==='playlist')return;
  // Spin all shuffle-btn icons
  document.querySelectorAll('.shuffle-btn').forEach(b=>{b.classList.add('spinning');b.disabled=true;});
  renderMain(true).then(()=>{
    document.querySelectorAll('.shuffle-btn').forEach(b=>{b.classList.remove('spinning');b.disabled=false;});
    // Scroll queue into view smoothly
    const qw=document.getElementById('queue-wrap');
    if(qw) qw.scrollIntoView({behavior:'smooth',block:'nearest'});
  });
}

// SHOW HERO HTML
function getHeroHTML(show,type){
  const poster=show.poster_path?IMG+'w185'+show.poster_path:'';
  const title=show.name||show.title||'';
  const year=((show.first_air_date||show.release_date)||'').slice(0,4);
  const rating=show.vote_average?show.vote_average.toFixed(1)+'/10':'N/A';
  const overview=show.overview||'';
  const oid='ov-'+show.id;
  return `<div class="show-hero">
    <img class="show-hero-poster" src="${poster}" onerror="this.style.background='#1a1a1a'" />
    <div class="show-hero-info">
      <div class="show-hero-title">${title}</div>
      <div class="show-hero-meta">
        <span>${year}</span>
        <span>${rating}</span>
        ${type==='tv'&&show.number_of_seasons?`<span>${show.number_of_seasons} Season${show.number_of_seasons!==1?'s':''}</span>`:''}
        ${type==='movie'&&show.runtime?`<span>${show.runtime} min</span>`:''}
      </div>
      <div id="${oid}" style="font-size:0.76rem;color:var(--muted);line-height:1.5;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;">${overview}</div>
      ${overview.length>120?`<button onclick="toggleOv('${oid}',this)" style="background:none;border:none;color:var(--blue);font-size:0.7rem;padding:2px 0 4px;cursor:pointer;font-family:'DM Sans',sans-serif;">${t('btn.readMore')}</button>`:''}
    </div>
  </div>
  <div id="providers-container" class="wtw-box">
    <div class="wtw-loading">Loading where to watch...</div>
  </div>`;
}

function toggleOv(id,btn){
  const el=document.getElementById(id);
  if(!el)return;
  const clamped=el.style.webkitLineClamp!=='unset';
  el.style.webkitLineClamp=clamped?'unset':'3';
  el.style.overflow=clamped?'visible':'hidden';
  btn.textContent=clamped?t('btn.readLess'):t('btn.readMore');
}

// MOVIES
async function renderMovieMain(show){
  allSeasons=[];
  clearSeasonsSidebar();
  try{
    const r=await fetch(`https://api.themoviedb.org/3/movie/${show.id}?api_key=${KEY}`);
    const d=await r.json();
    currentShow={...show,...d};
  }catch(e){}
  const showName=currentShow.title||currentShow.name||'';
  const fallbackLink=getEpLink();
  const backBtn=`<button class="back-btn" onclick="goBackHome()">
    <svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
    ${t('btn.back')}
  </button>`;
  const html=backBtn+getHeroHTML(currentShow,'movie')+
  `<div class="shuffle-result-card" style="margin-top:4px;">
    ${currentShow.backdrop_path?`<img class="shuffle-result-still" src="${IMG+'w780'+currentShow.backdrop_path}" />`:''}
    <div class="shuffle-result-body">
      <div class="shuffle-result-label">${t('label.movie')}</div>
      <div class="shuffle-result-title">${showName}</div>
      <div class="shuffle-result-meta">
        <span>${((currentShow.release_date)||'').slice(0,4)}</span>
        ${currentShow.runtime?`<span>${currentShow.runtime} min</span>`:''}
        ${currentShow.vote_average>0?`<span>${currentShow.vote_average.toFixed(1)}/10</span>`:''}
        ${currentShow.genres?currentShow.genres.slice(0,2).map(g=>`<span>${g.name}</span>`).join(''):''}
      </div>
      <div class="shuffle-result-overview">${currentShow.overview||''}</div>
    </div>
  </div>`;
  showMain(html);
  // Load providers into the hero card
  fetchProviders(currentShow.id,'movie',showName).then(pd=>{
    const el=document.getElementById('providers-container');
    if(!el)return;
    el.innerHTML=pd ? (buildProviderHTML(pd,showName)||buildFallbackProviders(showName)) : buildFallbackProviders(showName);
  }).catch(()=>{
    const el=document.getElementById('providers-container');
    if(el) el.innerHTML=buildFallbackProviders(showName);
  });
}

// MAIN TV RENDER
async function renderMain(doShuffle=false){
  return new Promise(async(resolve)=>{
  if(!currentShow||currentType!=='tv')return;
  showMain('<div class="empty-state"><div class="empty-title" style="animation:blink 0.8s infinite">'+t('empty.loading')+'</div></div>');
  const seasonsToLoad=selectedSeason
    ?allSeasons.filter(s=>s.season_number===selectedSeason)
    :allSeasons.filter(s=>!blockedSeasons.has(s.season_number));
  for(const s of seasonsToLoad){
    if(!allEpisodes[s.season_number]){
      try{
        const r=await fetch(`https://api.themoviedb.org/3/tv/${currentShow.id}/season/${s.season_number}?api_key=${KEY}`);
        const d=await r.json();
        allEpisodes[s.season_number]=d.episodes||[];
      }catch(e){}
    }
  }
  let flatEps=[];
  for(const s of seasonsToLoad)flatEps=flatEps.concat((allEpisodes[s.season_number]||[]).map(e=>({...e,seasonNum:s.season_number})));
  const filtered=flatEps.filter(e=>minRating===0||(e.vote_count>=3&&e.vote_average>=minRating));
  if(doShuffle&&filtered.length){
    const shuffled=[...filtered].sort(()=>Math.random()-0.5);
    highlightedEps=shuffled.slice(0,Math.min(3,shuffled.length));
  }

  let html=`<button class="back-btn" onclick="goBackHome()">
    <svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
    ${t('btn.back')}
  </button>`;
  html+=getHeroHTML(currentShow,'tv');

  if(highlightedEps.length){
    html+=`<div class="queue-wrap" id="queue-wrap">
      <div class="queue-header">
        <div class="queue-label">${t('label.upNext')}</div>

      </div>`;
    highlightedEps.forEach((e,i)=>{
      const code=`S${String(e.seasonNum).padStart(2,'0')} · E${String(e.episode_number).padStart(2,'0')}`;
      const meta=[];
      if(e.vote_average>0) meta.push(e.vote_average.toFixed(1)+'/10');
      if(e.runtime) meta.push(e.runtime+' min');
      html+=`<div class="queue-item" onclick="openEpSheet(${e.episode_number},${e.seasonNum})">
        <div class="queue-num">${i+1}</div>
        <div class="queue-info">
          <div class="queue-ep-code">${code}</div>
          <div class="queue-ep-title">${e.name||'Episode '+e.episode_number}</div>
          ${meta.length?`<div class="queue-ep-meta">${meta.join(' · ')}</div>`:''}
        </div>
        <div class="queue-arrow">›</div>
      </div>`;
    });
    html+=`</div>`;
  }

  const seasonGroups={};
  flatEps.forEach(e=>{if(!seasonGroups[e.seasonNum])seasonGroups[e.seasonNum]=[];seasonGroups[e.seasonNum].push(e);});
  Object.keys(seasonGroups).map(Number).sort((a,b)=>a-b).forEach(sNum=>{
    html+=`<div class="ep-season-block">
      <div class="ep-season-header">
        <div class="section-header" style="margin-bottom:6px;">SEASON ${String(sNum).padStart(2,'0')}</div>
      </div>
      <div class="ep-season-list">`;
    seasonGroups[sNum].forEach(e=>{html+=renderEpRow(e);});
    html+=`</div></div>`;
  });
  if(!flatEps.length)html+=`<div class="empty-state"><div class="empty-sub">${t('empty.noEpisodes')}</div></div>`;
  showMain(html);
  const _tvShowName=currentShow.name||currentShow.title||'';
  const _tvProviderTimeout=setTimeout(()=>{
    const el=document.getElementById('providers-container');
    if(el&&el.querySelector('.wtw-loading')) el.innerHTML=buildFallbackProviders(_tvShowName);
  },5000);
  fetchProviders(currentShow.id,'tv',_tvShowName).then(pd=>{
    clearTimeout(_tvProviderTimeout);
    const el=document.getElementById('providers-container');
    if(!el)return;
    el.innerHTML=pd ? (buildProviderHTML(pd,_tvShowName)||buildFallbackProviders(_tvShowName)) : buildFallbackProviders(_tvShowName);
  }).catch(()=>{
    clearTimeout(_tvProviderTimeout);
    const el=document.getElementById('providers-container');
    if(el) el.innerHTML=buildFallbackProviders(_tvShowName);
  });
  resolve();
  });
}

function getEpLink(){
  const saved=localStorage.getItem('shufflr_service');
  const map={
    netflix:'https://www.netflix.com',
    max:'https://play.max.com',
    hulu:'https://www.hulu.com',
    disney:'https://www.disneyplus.com',
    prime:'https://www.amazon.com/prime-video',
    tubi:'https://tubitv.com',
    peacock:'https://www.peacocktv.com',
    paramount:'https://www.paramountplus.com',
    appletv:'https://tv.apple.com',
    crunchyroll:'https://www.crunchyroll.com',
  };
  return map[saved]||'https://www.netflix.com';
}

let _currentSheetEp=null;
let _pendingEp=null; // episode being added to playlist (null = adding show)
let _openAccordionKey=null;

function buildEpAccordionDetail(e){
  const meta=[];
  if(e.vote_average>0) meta.push(e.vote_average.toFixed(1)+'/10');
  if(e.runtime) meta.push(e.runtime+' min');
  if(e.air_date) meta.push(e.air_date.slice(0,4));
  const accordionId=`ep-accordion-${e.seasonNum}-${e.episode_number}`;
  return `<div class="ep-accordion-detail" id="${accordionId}" hidden>
    <div class="ep-sheet-meta">${meta.join('  \u00b7  ')}</div>
    <div class="ep-sheet-overview">${escapeHtml(e.overview||'No description available.')}</div>
  </div>`;
}

function renderEpRow(e){
  const key=`${currentShow.id}-s${e.seasonNum}e${e.episode_number}`;
  const watched=watchHistory.some(h=>h.key===key);
  const isHL=highlightedEps.some(h=>h.id===e.id);
  return `<div class="ep-compact-wrap">
    <div class="ep-compact${isHL?' highlighted':''}${watched?' watched':''}"
      data-rating="${e.vote_average||0}" data-votes="${e.vote_count||0}" data-key="${key}"
      onclick="toggleEpAccordion(${e.episode_number},${e.seasonNum})">
      <div class="ep-compact-num">E${String(e.episode_number).padStart(2,'0')}</div>
      <div class="ep-compact-title">${e.name||'Episode '+e.episode_number}</div>
      ${watched?'<div class="ep-compact-check">\u2713</div>':''}
    </div>
    ${buildEpAccordionDetail(e)}
  </div>`;
}

function collapseAllEpAccordions(){
  document.querySelectorAll('.ep-accordion-detail').forEach(el=>{el.hidden=true;});
  _openAccordionKey=null;
}

function openEpSheet(epNum,seasonNum){
  const accordionId=`ep-accordion-${seasonNum}-${epNum}`;
  const panel=document.getElementById(accordionId);
  const eps=allEpisodes[seasonNum]||[];
  const e=eps.find(ep=>ep.episode_number===epNum);
  if(!e||!panel)return;
  collapseAllEpAccordions();
  panel.hidden=false;
  _openAccordionKey=`${seasonNum}-${epNum}`;
  _currentSheetEp=e;
  const watchKey=`${currentShow.id}-s${seasonNum}e${epNum}`;
  markWatched(watchKey,currentShow.name||currentShow.title||'',e.name||'',seasonNum,epNum,currentShow.poster_path||'');
  panel.scrollIntoView({behavior:'smooth',block:'nearest'});
}

function toggleEpAccordion(epNum,seasonNum){
  const key=`${seasonNum}-${epNum}`;
  if(_openAccordionKey===key){
    collapseAllEpAccordions();
    _currentSheetEp=null;
    return;
  }
  openEpSheet(epNum,seasonNum);
}

function closeEpSheet(){
  collapseAllEpAccordions();
  _currentSheetEp=null;
}


function markWatched(key,showName,epName,season,epNum,poster){
  if(!watchHistory.some(h=>h.key===key)){
    watchHistory.push({key,showName,epName,season,epNum,poster,date:new Date().toLocaleDateString()});
    localStorage.setItem('shufflr_history',JSON.stringify(watchHistory));
  }
}

function shareEp(e,url){
  e.preventDefault();e.stopPropagation();
  navigator.clipboard.writeText(url).then(()=>showToast('LINK COPIED'));
}

// PLAYLISTS PAGE
function buildPlCardItemsHtml(p, pi) {
  const shows = p.shows || [];
  const episodes = p.episodes || [];
  if (!shows.length && !episodes.length) {
    return `<div class="pl-empty">${t('empty.nothingAdded')}</div>`;
  }
  let rows = '';
  shows.forEach((s, si) => {
    rows += `<div class="pl-show-row" draggable="true"
      ondragstart="dragStart(event,${pi},${si},'show')"
      ondragover="dragOver(event)"
      ondragleave="dragLeave(event)"
      ondrop="dragDrop(event,${pi},${si})"
      ondragend="dragEnd(event)">
      <span class="drag-handle">⠿</span>
      ${buildPlRowPosterHtml(s, pi, si, 'show')}
      <div style="flex:1;min-width:0;">
        <div class="pl-show-name">${s.name || s.title}</div>
        <div class="pl-show-year">${((s.first_air_date || s.release_date) || '').slice(0, 4)} · ${t('pl.fullShow')}</div>
      </div>
      <button class="pl-remove-btn" onclick="removeShowFromPlaylist(${pi},${si})" title="Remove">✕</button>
    </div>`;
  });
  episodes.forEach((e, ei) => {
    const code = `S${String(e.seasonNum || '?').padStart(2, '0')} E${String(e.episode_number || '?').padStart(2, '0')}`;
    rows += `<div class="pl-show-row">
      <span class="drag-handle" style="color:#23A8E0;font-size:0.6rem;width:18px;text-align:center;">▶</span>
      ${buildPlRowPosterHtml(e, pi, ei, 'ep')}
      <div style="flex:1;min-width:0;">
        <div style="font-size:0.58rem;color:var(--blue);font-weight:700;letter-spacing:1px;margin-bottom:1px;">${code}</div>
        <div class="pl-show-name" style="font-size:0.82rem;">${e.name || 'Episode'}</div>
        <div class="pl-show-year">${e.showName || ''}</div>
      </div>
      <button class="pl-remove-btn" onclick="removeEpFromPlaylist(${pi},${ei})" title="Remove">✕</button>
    </div>`;
  });
  return `<div class="pl-card-items">${rows}</div>`;
}

function handlePlaylistHeaderClick(event, pi) {
  if (event.target.closest('.pl-card-actions')) return;
  expandedPlaylistIndex = expandedPlaylistIndex === pi ? null : pi;
  document.querySelectorAll('.pl-card').forEach((card) => {
    const cardIndex = parseInt(card.dataset.plIndex, 10);
    card.classList.toggle('expanded', cardIndex === expandedPlaylistIndex);
  });
}

function collapseExpandedPlaylist() {
  if (expandedPlaylistIndex === null) return;
  expandedPlaylistIndex = null;
  document.querySelectorAll('.pl-card.expanded').forEach((card) => card.classList.remove('expanded'));
}

function showAddShowFromPlaylistToast(event) {
  event?.stopPropagation?.();
  showToast('Add shows from Max using the Shufflr button');
}

function renderPlaylistPage(){
  let html=`<div class="playlist-page">
  <div class="playlist-page-header">
    <div class="playlist-page-title">${t('section.myPlaylists')}</div>
  </div>
  <div class="new-pl-row">
    <input class="new-pl-input" id="inline-pl-input" placeholder="${t('pl.newPlaylistPlaceholder')}" />
    <button class="new-pl-btn" onclick="createInlinePlaylist()">+ ${t('btn.create')}</button>
  </div>`;
  if(!playlists.length){
    html+=`<div class="empty-state"><div class="empty-sub">${t('empty.noPlaylistsPlaylistTab')}</div></div>`;
  } else {
    html+=playlists.map((p,pi)=>{
      const itemCount=(p.shows||[]).length+(p.episodes||[]).length;
      const expanded=expandedPlaylistIndex===pi;
      return `
      <div class="pl-card${expanded?' expanded':''}" data-pl-index="${pi}">
        <div class="pl-card-header" onclick="handlePlaylistHeaderClick(event, ${pi})">
          <div class="pl-card-header-info">
            <div class="pl-card-name">${p.name}</div>
            <div class="pl-card-count">${itemCount} ${itemCount!==1?t('pl.items'):t('pl.item')}</div>
          </div>
          <div class="pl-card-actions" onclick="event.stopPropagation()">
            <button class="pl-shuffle-btn" onclick="sharePlaylist(${pi})" style="border-color:var(--muted);color:var(--muted);">
              <svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
              ${t('btn.share').toUpperCase()}
            </button>
            <button class="pl-shuffle-btn" onclick="playPlaylist(${pi})" style="background:var(--blue);color:#000;border-color:var(--blue);" title="Open your connected streaming service">
              ▶ ${t('btn.play').toUpperCase()}
            </button>
            <button class="pl-delete-btn" onclick="deletePlaylist(${pi})">${t('btn.delete')}</button>
          </div>
        </div>
        <div class="pl-card-body">
          <div class="pl-card-body-inner">
            ${buildPlCardItemsHtml(p, pi)}
            <button type="button" class="pl-add-show-btn" onclick="showAddShowFromPlaylistToast(event)">+ ${t('btn.addShow')}</button>
          </div>
        </div>
      </div>`;
    }).join('');
  }
  html+=`</div>`;
  showMain(html);
  resolvePlaylistRowPosters(playlists);
}

function createInlinePlaylist(){
  const input=document.getElementById('inline-pl-input');
  const name=input.value.trim();
  if(!name)return;
  playlists.push({
    name,
    shows:[],
    // Tag playlist with service — hardcoded to 'max' until multi-service support is added.
    service: 'max',
  });
  savePlaylists();
  renderPlaylistPage();
}

function deletePlaylist(i){
  playlists.splice(i,1);
  if(expandedPlaylistIndex===i)expandedPlaylistIndex=null;
  else if(expandedPlaylistIndex!==null&&expandedPlaylistIndex>i)expandedPlaylistIndex--;
  savePlaylists();
  renderPlaylistPage();
}

function removeFromPlaylist(pi,si){
  // legacy - remove show
  if(playlists[pi].shows) playlists[pi].shows.splice(si,1);
  savePlaylists();
  renderPlaylistPage();
}
function removeShowFromPlaylist(pi,si){
  if(playlists[pi].shows) playlists[pi].shows.splice(si,1);
  savePlaylists();
  renderPlaylistPage();
}
function removeEpFromPlaylist(pi,ei){
  if(playlists[pi].episodes) playlists[pi].episodes.splice(ei,1);
  savePlaylists();
  renderPlaylistPage();
}

// Opens the Playlist tab and highlights the playlist at the given index.
function openPlaylistFromHomeCard(index) {
  expandedPlaylistIndex = index;
  setNav('playlist');
  setTimeout(() => {
    const card = document.querySelector(`.pl-card[data-pl-index="${index}"]`);
    if (card) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 150);
}

let homePlaylistsCache = [];
let openDrawerPlaylistIndex = null;
let drawerAddShowMode = false;
let drawerAddShowAllCandidates = [];

function getPlaylistShowLabel(show) {
  return show?.title || show?.name || 'Untitled';
}

function getShowMaxUrlFromPlaylistShow(show) {
  // Prefer a saved Max URL on the show object (extension or synced entries).
  const maxUrl = show?.url || show?.maxUrl || show?.href || show?.watchUrl || null;
  if (maxUrl && String(maxUrl).includes('max.com')) {
    return String(maxUrl);
  }

  // Extension-added shows store a Max UUID as maxId — link directly to the show page.
  const maxId = show?.maxId || show?.maxShowId || show?.max_id;
  if (maxId) {
    return `https://play.max.com/show/${String(maxId)}`;
  }

  // TMDB-added shows with no Max URL — fall back to Max search.
  const query = encodeURIComponent(getPlaylistShowLabel(show));
  if (!query) return null;
  return `https://play.max.com/search?q=${query}`;
}

function setActivePlaylistViaBridge(playlist, launchUrl) {
  window.postMessage({
    type: 'SHUFFLR_SET_ACTIVE_PLAYLIST',
    playlist,
    launchUrl,
  }, '*');
}

function setStandaloneLaunchViaBridge(launchUrl, maxId = null, blockedSeasons = null) {
  window.postMessage({
    type: 'SHUFFLR_LAUNCH_STANDALONE_SHOW',
    launchUrl,
    maxId: maxId || null,
    blockedSeasons: Array.isArray(blockedSeasons) ? blockedSeasons : null,
  }, '*');
}

function launchShowStandaloneFromNowPlaying(playlistIndex, showIndex) {
  const show = playlists[playlistIndex]?.shows?.[showIndex];
  if (!show) return;
  const launchUrl = getShowMaxUrlFromPlaylistShow(show);
  if (!launchUrl) return;
  setStandaloneLaunchViaBridge(launchUrl);
  window.open(launchUrl, '_blank');
}

function savePlaylistsViaBridge(allPl) {
  window.postMessage({
    type: 'SHUFFLR_SAVE_PLAYLISTS',
    playlists: allPl,
  }, '*');
}

function positionPlaylistDrawer(index) {
  const drawer = document.getElementById('pl-home-drawer');
  const card = document.querySelector(`.pl-home-card[data-pl-index="${index}"]`);
  const section = drawer?.closest('.pl-home-section');
  if (!drawer || !card || !section) return;
  const cardRect = card.getBoundingClientRect();
  const sectionRect = section.getBoundingClientRect();
  drawer.style.left = `${Math.round(cardRect.right - sectionRect.left + 8)}px`;
}

function renderDrawerShowList(playlistIndex, playlist) {
  const body = document.getElementById('pl-drawer-body');
  if (!body) return;
  const shows = playlist.shows || [];
  body.innerHTML = shows.length
    ? shows.map((show, si) => (
      `<button type="button" class="pl-drawer-show-row" style="display:flex;align-items:center;" onclick="launchShowFromDrawer(${playlistIndex}, ${si})">
        ${buildDrawerShowThumbnailHtml(show)}
        <span class="pl-drawer-add-show-name">${escapeHtml(stripServiceSuffixFromShowName(getPlaylistShowLabel(show)))}</span>
      </button>`
    )).join('')
    : '<div class="pl-drawer-empty">No shows in this playlist.</div>';
  resolveDrawerShowPosters(shows);
}

function updatePlaylistDrawerContent(playlist, playlistIndex) {
  const drawer = document.getElementById('pl-home-drawer');
  if (!drawer) return;
  drawerAddShowMode = false;
  drawerAddShowAllCandidates = [];

  drawer.innerHTML = `
    <button type="button" class="pl-drawer-close" onclick="closePlaylistDrawer()" aria-label="${t('drawer.close')}">✕</button>
    <div class="pl-drawer-title">${escapeHtml(playlist.name || 'Untitled')}</div>
    <div class="pl-drawer-actions">
      <button type="button" class="pl-drawer-btn pl-drawer-btn-primary" onclick="playRandomShowFromDrawer(${playlistIndex})"><span class="pl-drawer-btn-icon">▶</span> ${t('btn.play')}</button>
      <button type="button" class="pl-drawer-btn pl-drawer-btn-outline" onclick="editPlaylistFromDrawer(${playlistIndex})"><span class="pl-drawer-btn-icon">✎</span> ${t('btn.edit')}</button>
      <button type="button" class="pl-drawer-btn pl-drawer-btn-outline" onclick="openDrawerAddShowMode(${playlistIndex})"><span class="pl-drawer-btn-icon">＋</span> ${t('btn.addShow')}</button>
    </div>
    <div class="pl-drawer-shows" id="pl-drawer-body"></div>`;
  renderDrawerShowList(playlistIndex, playlist);
}

function togglePlaylistDrawer(index) {
  if (openDrawerPlaylistIndex === index) {
    closePlaylistDrawer();
    return;
  }
  closeYourShowPopup();
  openDrawerPlaylistIndex = index;
  const drawer = document.getElementById('pl-home-drawer');
  const playlist = homePlaylistsCache[index];
  if (!drawer || !playlist) return;
  updatePlaylistDrawerContent(playlist, index);
  drawer.hidden = false;
  positionPlaylistDrawer(index);
}

function closePlaylistDrawer() {
  openDrawerPlaylistIndex = null;
  drawerAddShowMode = false;
  drawerAddShowAllCandidates = [];
  const drawer = document.getElementById('pl-home-drawer');
  if (drawer) drawer.hidden = true;
}

function playRandomShowFromDrawer(playlistIndex) {
  const shows = homePlaylistsCache[playlistIndex]?.shows || [];
  if (!shows.length) return;
  launchShowFromDrawer(playlistIndex, Math.floor(Math.random() * shows.length));
}

async function launchShowFromDrawer(playlistIndex, showIndex) {
  const loggedIn=typeof window.shufflrIsLoggedIn==='function'?await window.shufflrIsLoggedIn():false;
  if(!loggedIn){showToast('You must sign in to use this feature.');return;}
  const playlist = homePlaylistsCache[playlistIndex];
  const show = (playlist?.shows || [])[showIndex];
  if (!playlist || !show) return;
  const launchUrl = getShowMaxUrlFromPlaylistShow(show);
  if (!launchUrl) return;
  setActivePlaylistViaBridge(playlist, launchUrl);
  window.open(launchUrl, '_blank');
  closePlaylistDrawer();
}

function editPlaylistFromDrawer(index) {
  closePlaylistDrawer();
  openPlaylistFromHomeCard(index);
}

function openDrawerAddShowMode(playlistIndex) {
  drawerAddShowMode = true;
  renderDrawerAddShowPicker(playlistIndex);
}

function getCrossPlaylistShowsForAdd(playlistIndex) {
  const currentPlaylist = homePlaylistsCache[playlistIndex];
  const seenNames = new Set();
  const candidates = [];

  homePlaylistsCache.forEach((playlist, pi) => {
    if (pi === playlistIndex) return;
    for (const show of playlist.shows || []) {
      if (isShowInPlaylist(currentPlaylist, show)) continue;
      const nameKey = normalizePlShowName(getPlaylistShowLabel(show));
      if (!nameKey || seenNames.has(nameKey)) continue;
      seenNames.add(nameKey);
      candidates.push(show);
    }
  });

  return candidates.sort((a, b) => (
    getPlaylistShowLabel(a).localeCompare(getPlaylistShowLabel(b), undefined, { sensitivity: 'base' })
  ));
}

function getDrawerAddShowPosterHtml(show) {
  const raw = show?.poster_path || show?.posterPath || show?.showPoster || show?.poster || show?.image || '';
  const text = String(raw || '').trim();
  if (!text) {
    return '<div class="pl-drawer-add-poster pl-drawer-add-poster-placeholder"></div>';
  }
  if (/^https?:\/\//i.test(text)) {
    return `<img class="pl-drawer-add-poster" src="${escapeHtml(text)}" alt="" onerror="this.outerHTML='<div class=\\'pl-drawer-add-poster pl-drawer-add-poster-placeholder\\'></div>'" />`;
  }
  const path = text.startsWith('/') ? text : `/${text}`;
  return `<img class="pl-drawer-add-poster" src="${IMG}w92${escapeHtml(path)}" alt="" onerror="this.outerHTML='<div class=\\'pl-drawer-add-poster pl-drawer-add-poster-placeholder\\'></div>'" />`;
}

function buildDrawerAddShowRowHtml(playlistIndex, candidateIndex, show) {
  return `<button type="button" class="pl-drawer-show-row pl-drawer-add-show-row" onclick="addCrossPlaylistShowToDrawer(${playlistIndex}, ${candidateIndex})">
    ${getDrawerAddShowPosterHtml(show)}
    <span class="pl-drawer-add-show-name">${escapeHtml(getPlaylistShowLabel(show))}</span>
  </button>`;
}

function filterDrawerAddShowPicker(playlistIndex) {
  const picker = document.getElementById('pl-drawer-add-picker');
  const input = document.getElementById('pl-drawer-add-filter');
  if (!picker) return;

  const q = (input?.value || '').trim().toLowerCase();
  const matches = drawerAddShowAllCandidates
    .map((show, i) => ({ show, i }))
    .filter(({ show }) => !q || getPlaylistShowLabel(show).toLowerCase().includes(q));

  if (!matches.length) {
    picker.innerHTML = '<div class="pl-drawer-empty">No matching shows.</div>';
    return;
  }

  picker.innerHTML = matches
    .map(({ show, i }) => buildDrawerAddShowRowHtml(playlistIndex, i, show))
    .join('');
}

function renderDrawerAddShowPicker(playlistIndex) {
  const body = document.getElementById('pl-drawer-body');
  if (!body) return;

  drawerAddShowAllCandidates = getCrossPlaylistShowsForAdd(playlistIndex);
  const createBtn = `<button type="button" class="pl-drawer-create-playlist-btn" onclick="createPlaylistFromDrawerAddMode(${playlistIndex})">＋ Create New Playlist</button>`;

  if (!drawerAddShowAllCandidates.length) {
    body.innerHTML = `
      <div class="pl-drawer-add-mode">
        <button type="button" class="pl-drawer-cancel-add" onclick="cancelDrawerAddShowMode(${playlistIndex})">✕ ${t('drawer.cancelAdd')}</button>
        <div class="pl-drawer-empty">Add shows from Max using the Shufflr button</div>
        ${createBtn}
      </div>`;
    return;
  }

  body.innerHTML = `
    <div class="pl-drawer-add-mode">
      <div class="pl-drawer-add-toolbar">
        <button type="button" class="pl-drawer-cancel-add" onclick="cancelDrawerAddShowMode(${playlistIndex})">✕ ${t('drawer.cancelAdd')}</button>
        <input type="text" class="pl-drawer-add-filter" id="pl-drawer-add-filter" placeholder="Filter shows..." oninput="filterDrawerAddShowPicker(${playlistIndex})" autocomplete="off" />
      </div>
      <div class="pl-drawer-add-picker" id="pl-drawer-add-picker"></div>
      ${createBtn}
    </div>`;
  filterDrawerAddShowPicker(playlistIndex);
}

async function createPlaylistFromDrawerAddMode(playlistIndex) {
  const name = await promptPlaylistName('Playlist name:');
  if (!name || !name.trim()) return;

  const newPlaylist = {
    name: name.trim(),
    shows: [],
    service: 'max',
  };

  homePlaylistsCache.push(newPlaylist);
  playlists = homePlaylistsCache;
  localStorage.setItem(SHUFFLR_PLAYLISTS_KEY, JSON.stringify(playlists));
  savePlaylistsViaBridge(homePlaylistsCache);

  drawerAddShowMode = false;
  drawerAddShowAllCandidates = [];
  closePlaylistDrawer();
  renderHomeScreen('shows');
}

function cancelDrawerAddShowMode(playlistIndex) {
  drawerAddShowMode = false;
  drawerAddShowAllCandidates = [];
  const playlist = homePlaylistsCache[playlistIndex];
  if (playlist) renderDrawerShowList(playlistIndex, playlist);
}

function addCrossPlaylistShowToDrawer(playlistIndex, candidateIndex) {
  const show = drawerAddShowAllCandidates[candidateIndex];
  const playlist = homePlaylistsCache[playlistIndex];
  if (!show || !playlist) return;
  if (!playlist.shows) playlist.shows = [];
  if (isShowInPlaylist(playlist, show)) {
    cancelDrawerAddShowMode(playlistIndex);
    return;
  }

  playlist.shows.push({ ...show });
  if (!playlist.service) playlist.service = 'max';

  homePlaylistsCache[playlistIndex] = playlist;
  playlists = homePlaylistsCache;
  localStorage.setItem(SHUFFLR_PLAYLISTS_KEY, JSON.stringify(playlists));
  savePlaylistsViaBridge(homePlaylistsCache);
  cancelDrawerAddShowMode(playlistIndex);
}

// Triggers a file picker to set a custom poster image for a playlist, stored in localStorage as base64.
function triggerPlaylistPosterPicker(playlistKey) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      localStorage.setItem('shufflr_playlist_poster_' + playlistKey, ev.target.result);
      renderHomeScreen('shows');
    };
    reader.readAsDataURL(file);
  };
  input.click();
}

// ── SMART SHUFFLE + EXTENSION HANDOFF ───────────────────────────────────────
const SHUFFLR_EPISODE_STATE_KEY='shufflr_episode_state';
const SHUFFLR_SHUFFLE_SETTINGS_KEY='shufflr_shuffle_settings';

function deserializeRoundPlayedShows(serialized){
  if(!Array.isArray(serialized))return new Set();
  return new Set(serialized.map(id=>String(id)));
}
function serializeRoundPlayedShows(roundPlayedShows){
  return [...(roundPlayedShows||new Set())].map(id=>String(id));
}
async function readShuffleSettings(){
  try{
    if(typeof chrome!=='undefined'&&chrome.storage?.local){
      const stored=await new Promise(resolve=>{
        chrome.storage.local.get(SHUFFLR_SHUFFLE_SETTINGS_KEY,result=>{
          resolve(result[SHUFFLR_SHUFFLE_SETTINGS_KEY]);
        });
      });
      if(stored)return {orderedEpisodes:!!stored.orderedEpisodes};
    }
  }catch(e){}
  const local=JSON.parse(localStorage.getItem(SHUFFLR_SHUFFLE_SETTINGS_KEY)||'{}');
  return {orderedEpisodes:!!local.orderedEpisodes};
}
const MAX_WATCH_ORIGIN='https://play.max.com';
const SERVICE_AVAILABILITY={
  netflix:{ids:[8],names:['netflix']},
  max:{ids:[384,1899],names:['max','hbo max','hbo']},
  hulu:{ids:[15],names:['hulu']},
  disney:{ids:[337],names:['disney','disney+']},
  prime:{ids:[9,119],names:['prime','amazon','prime video']},
  tubi:{ids:[531],names:['tubi']},
  peacock:{ids:[387],names:['peacock']},
  paramount:{ids:[1855],names:['paramount']},
  appletv:{ids:[2,386],names:['apple','apple tv']},
  crunchyroll:{ids:[583],names:['crunchyroll']},
  pluto:{ids:[257],names:['pluto']},
};

function smartShuffleEpKey(seasonNum,epNum){return `s${seasonNum}e${epNum}`;}
function serializePlayedByShow(playedByShow){
  const out={};
  Object.keys(playedByShow).forEach(showId=>{out[showId]=[...playedByShow[showId]];});
  return out;
}
function smartShuffle(enrichedShows,playedByShow,lastPlayedShow,allowedMaxIds=null,options={}){
  const roundPlayedShows=options.roundPlayedShows instanceof Set
    ?options.roundPlayedShows
    :deserializeRoundPlayedShows(options.roundPlayedShows);
  const orderedEpisodes=!!options.orderedEpisodes;
  const nextEpisodeIndexByShow={...(options.nextEpisodeIndexByShow||{})};

  let availableShows=enrichedShows.filter(show=>show.onService!==false&&show.episodes?.length);
  if(allowedMaxIds?.size){
    availableShows=availableShows.filter(show=>allowedMaxIds.has(String(show.id).toLowerCase()));
  }
  if(!availableShows.length)return null;

  let roundShows=availableShows.filter(show=>!roundPlayedShows.has(String(show.id)));
  if(!roundShows.length){
    roundPlayedShows.clear();
    roundShows=availableShows;
  }

  let showPool=roundShows;
  if(lastPlayedShow&&showPool.length>1){
    const withoutLast=showPool.filter(show=>String(show.id)!==String(lastPlayedShow));
    if(withoutLast.length)showPool=withoutLast;
  }

  if(orderedEpisodes){
    const show=showPool[Math.floor(Math.random()*showPool.length)];
    const showId=String(show.id);
    const idx=nextEpisodeIndexByShow[showId]||0;
    const episode=show.episodes[idx%show.episodes.length];
    if(!episode)return null;
    const pick={...episode,showId:show.id};
    nextEpisodeIndexByShow[showId]=(idx+1)%show.episodes.length;
    if(!playedByShow[showId])playedByShow[showId]=new Set();
    playedByShow[showId].add(pick.id);
    roundPlayedShows.add(showId);
    return {pick,lastPlayedShow:showId,roundPlayedShows,nextEpisodeIndexByShow};
  }

  let candidates=[];
  for(const show of showPool){
    const showId=String(show.id);
    if(!playedByShow[showId])playedByShow[showId]=new Set();
    let unplayed=show.episodes.filter(ep=>!playedByShow[showId].has(ep.id));
    if(!unplayed.length){
      playedByShow[showId].clear();
      unplayed=show.episodes;
    }
    candidates=candidates.concat(unplayed.map(ep=>({...ep,showId:show.id})));
  }
  if(!candidates.length){
    candidates=availableShows.flatMap(show=>show.episodes.map(ep=>({...ep,showId:show.id})));
  }
  if(!candidates.length)return null;
  const pick=candidates[Math.floor(Math.random()*candidates.length)];
  const pickShowId=String(pick.showId);
  if(!playedByShow[pickShowId])playedByShow[pickShowId]=new Set();
  playedByShow[pickShowId].add(pick.id);
  roundPlayedShows.add(pickShowId);
  return {pick,lastPlayedShow:pickShowId,roundPlayedShows,nextEpisodeIndexByShow};
}
async function showAvailableOnService(showId,type,selectedService){
  const svc=SERVICE_AVAILABILITY[selectedService];
  if(!svc)return true;
  try{
    const pd=await fetchProviders(showId,type);
    if(!pd)return true;
    const all=[...(pd.free||[]),...(pd.flatrate||[]),...(pd.sub||[]),...(pd.rent||[])];
    return all.some(p=>svc.ids.includes(p.provider_id)||svc.names.some(n=>(p.provider_name||'').toLowerCase().includes(n)));
  }catch(e){return true;}
}
async function readMaxEpisodeCacheFromStorage(showName,tmdbId){
  return new Promise(resolve=>{
    const requestId=Math.random().toString(36).slice(2);
    const timer=setTimeout(()=>{cleanup();resolve([]);},5000);
    function handler(e){
      if(e.source!==window||e.data?.type!=='SHUFFLR_EPISODE_CACHE'||e.data.requestId!==requestId)return;
      cleanup();
      resolve(e.data.episodeDetails||[]);
    }
    function cleanup(){
      clearTimeout(timer);
      window.removeEventListener('message',handler);
    }
    window.addEventListener('message',handler);
    window.postMessage({type:'SHUFFLR_READ_EPISODE_CACHE',source:'shufflr-web',requestId,showName,tmdbId},'*');
  });
}
function mergeMaxEpisodeMetadata(episodes,maxEpisodes){
  if(!maxEpisodes?.length)return episodes;
  const map={};
  maxEpisodes.forEach(ep=>{
    map[smartShuffleEpKey(ep.seasonNum,ep.episode_number)]=ep;
  });
  return episodes.map(ep=>{
    const max=map[ep.id];
    if(!max)return ep;
    return {
      ...ep,
      alternateId:max.alternateId,
      watchUrl:max.watchUrl||(`${MAX_WATCH_ORIGIN}/video/watch/${max.alternateId}`),
    };
  });
}
async function fetchShowEpisodes(showId,showMeta,manualEps,selectedService){
  if(showMeta.release_date){
    return [{
      id:`movie-${showId}`,
      showId,
      showName:showMeta.name||showMeta.title||'',
      isMovie:true,
      name:showMeta.name||showMeta.title||'',
    }];
  }
  const r=await fetch(`https://api.themoviedb.org/3/tv/${showId}?api_key=${KEY}`);
  const d=await r.json();
  const seasons=(d.seasons||[]).filter(s=>s.season_number>0&&s.episode_count>0);
  const episodes=[];
  await Promise.all(seasons.map(async s=>{
    try{
      const sr=await fetch(`https://api.themoviedb.org/3/tv/${showId}/season/${s.season_number}?api_key=${KEY}`);
      const sd=await sr.json();
      (sd.episodes||[]).forEach(ep=>{
        episodes.push({
          id:smartShuffleEpKey(s.season_number,ep.episode_number),
          showId,
          showName:d.name||showMeta.name||'',
          seasonNum:s.season_number,
          episode_number:ep.episode_number,
          name:ep.name||'',
          runtime:ep.runtime||0,
          vote_average:ep.vote_average||0,
        });
      });
    }catch(e){}
  }));
  (manualEps||[]).forEach(ep=>{
    const id=smartShuffleEpKey(ep.seasonNum,ep.episode_number);
    if(!episodes.some(e=>e.id===id)){
      episodes.push({
        id,
        showId:ep.showId,
        showName:ep.showName||d.name||'',
        seasonNum:ep.seasonNum,
        episode_number:ep.episode_number,
        name:ep.name||'',
        runtime:ep.runtime||0,
        manuallyAdded:true,
        alternateId:ep.alternateId||null,
        watchUrl:ep.watchUrl||null,
      });
    }
  });
  if(selectedService==='max'){
    const maxEps=await readMaxEpisodeCacheFromStorage(showMeta.name||showMeta.title||d.name||'',showId);
    return mergeMaxEpisodeMetadata(episodes,maxEps);
  }
  return episodes;
}
async function buildEnrichedPlaylist(playlist,selectedService){
  const shows=playlist.shows||[];
  const manualEps=playlist.episodes||[];
  const enriched=[];
  const seenShowIds=new Set();
  await Promise.all(shows.map(async show=>{
    const eps=await fetchShowEpisodes(show.id,show,manualEps.filter(e=>e.showId===show.id),selectedService);
    enriched.push({
      id:show.id,
      name:show.name||show.title||'',
      type:show.release_date?'movie':'tv',
      episodes:eps,
    });
    seenShowIds.add(show.id);
  }));
  const orphanByShow={};
  manualEps.filter(e=>!seenShowIds.has(e.showId)).forEach(ep=>{
    if(!orphanByShow[ep.showId])orphanByShow[ep.showId]=[];
    orphanByShow[ep.showId].push({
      id:smartShuffleEpKey(ep.seasonNum,ep.episode_number),
      showId:ep.showId,
      showName:ep.showName||'',
      seasonNum:ep.seasonNum,
      episode_number:ep.episode_number,
      name:ep.name||'',
      runtime:ep.runtime||0,
      manuallyAdded:true,
    });
  });
  Object.keys(orphanByShow).forEach(showId=>{
    const episodes=orphanByShow[showId];
    enriched.push({id:Number(showId),name:episodes[0].showName,type:'tv',episodes});
  });
  return enriched;
}
async function filterPlaylistByService(enriched,selectedService){
  const checked=await Promise.all(enriched.map(async show=>{
    const onService=await showAvailableOnService(show.id,show.type==='movie'?'movie':'tv',selectedService);
    return {...show,onService};
  }));
  return checked.filter(show=>show.onService);
}
function buildSmartShuffleEpisodeUrl(pick,selectedService){
  if(pick.watchUrl)return pick.watchUrl;
  if(pick.alternateId&&selectedService==='max'){
    return `${MAX_WATCH_ORIGIN}/video/watch/${pick.alternateId}`;
  }
  const svc=STREAMING_SERVICES.find(s=>s.id===selectedService);
  const showName=pick.showName||'';
  if(pick.isMovie)return svc?svc.url+encodeURIComponent(showName):getEpLink();
  const query=`${showName} S${String(pick.seasonNum).padStart(2,'0')}E${String(pick.episode_number).padStart(2,'0')}`;
  return svc?svc.url+encodeURIComponent(query):getEpLink();
}
function buildActivePlaylistHandoff(playlist,enriched,selectedService,pick,playedByShow,lastPlayedShow,playlistIndex,extraState={}){
  return {
    armed:true,
    playlist:enriched.map(s=>({id:s.id,name:s.name,type:s.type,episodes:s.episodes})),
    playlistName:playlist.name||'',
    playlistIndex,
    shows:[...(playlist.shows||[])],
    episodes:[...(playlist.episodes||[])],
    selectedService,
    currentEpisode:{
      showId:pick.showId,
      showName:pick.showName,
      seasonNum:pick.seasonNum,
      episode_number:pick.episode_number,
      name:pick.name,
      isMovie:!!pick.isMovie,
      id:pick.id,
      alternateId:pick.alternateId||null,
    },
    currentEpisodeUrl:buildSmartShuffleEpisodeUrl(pick,selectedService),
    playedByShow:serializePlayedByShow(playedByShow),
    lastPlayedShow,
    roundPlayedShows:serializeRoundPlayedShows(extraState.roundPlayedShows),
    nextEpisodeIndexByShow:{...(extraState.nextEpisodeIndexByShow||{})},
    sessionStartedAt:Date.now(),
  };
}
function handoffActivePlaylistToExtension(payload){
  return new Promise(resolve=>{
    const storagePayload={[SHUFFLR_ACTIVE_PLAYLIST_KEY]:payload};
    if(payload.playedByShow){
      storagePayload[SHUFFLR_EPISODE_STATE_KEY]={
        playedByShow:payload.playedByShow,
        lastPlayedShow:payload.lastPlayedShow||null,
        roundPlayedShows:payload.roundPlayedShows||[],
        nextEpisodeIndexByShow:payload.nextEpisodeIndexByShow||{},
        playlistName:payload.playlistName||'',
        playlistIndex:payload.playlistIndex??0,
      };
    }
    const finish=()=>{
      localStorage.setItem(SHUFFLR_ACTIVE_PLAYLIST_KEY,JSON.stringify(payload));
      window.dispatchEvent(new CustomEvent('shufflr-handoff',{detail:payload}));
      window.postMessage({type:'SHUFFLR_HANDOFF',source:'shufflr-web',payload},'*');
      resolve();
    };
    try{
      if(typeof chrome!=='undefined'&&chrome.storage&&chrome.storage.local){
        chrome.storage.local.set(storagePayload,finish);
        return;
      }
    }catch(e){}
    finish();
  });
}
async function playPlaylist(pi){
  const loggedIn=typeof window.shufflrIsLoggedIn==='function'?await window.shufflrIsLoggedIn():false;
  if(!loggedIn){showToast('You must sign in to use this feature.');return;}
  const p=playlists[pi];
  if(!(p.shows||[]).length&&!(p.episodes||[]).length){showToast('NOTHING IN PLAYLIST');return;}
  const selectedService=localStorage.getItem('shufflr_service')||'netflix';
  showToast('SMART SHUFFLE...');
  const playedByShow={};
  const lastPlayedShow=null;
  const roundPlayedShows=new Set();
  const nextEpisodeIndexByShow={};
  const settings=await readShuffleSettings();
  try{
    let enriched=await buildEnrichedPlaylist(p,selectedService);
    enriched=await filterPlaylistByService(enriched,selectedService);
    if(!enriched.length)return;
    const result=smartShuffle(enriched,playedByShow,lastPlayedShow,null,{
      roundPlayedShows,
      orderedEpisodes:settings.orderedEpisodes,
      nextEpisodeIndexByShow,
    });
    if(!result){showToast('NO EPISODES FOUND');return;}
    const {pick,lastPlayedShow:newLast,roundPlayedShows:newRound,nextEpisodeIndexByShow:newIndexes}=result;
    const handoff=buildActivePlaylistHandoff(p,enriched,selectedService,pick,playedByShow,newLast,pi,{
      roundPlayedShows:newRound,
      nextEpisodeIndexByShow:newIndexes,
    });
    await handoffActivePlaylistToExtension(handoff);
    if(!pick.isMovie){
      markWatched(`${pick.showId}-s${pick.seasonNum}e${pick.episode_number}`,pick.showName,pick.name,pick.seasonNum,pick.episode_number,'');
      highlightedEps=[{...pick,seasonNum:pick.seasonNum,episode_number:pick.episode_number}];
      _timerEp={
        name:pick.name||'Episode',
        code:`S${String(pick.seasonNum).padStart(2,'0')} E${String(pick.episode_number).padStart(2,'0')}`,
        runtime:pick.runtime||45,
      };
      _timerNextEp=null;
      startTimerPhase1(60);
    }
    const label=(pick.name||pick.showName||'').toUpperCase().slice(0,18);
    showToast('PLAYING: '+label);
    window.open(handoff.currentEpisodeUrl,'_blank');
  }catch(e){
    console.error('[Shufflr] playPlaylist',e);
    showToast('PLAY FAILED');
  }
}

async function shufflePlaylist(pi){
  const p=playlists[pi];
  const shows=p.shows||[];
  const episodes=p.episodes||[];
  if(!shows.length&&!episodes.length){showToast('NOTHING IN PLAYLIST');return;}
  // Decide randomly between picking a show or a specific episode
  const allItems=[...shows.map(s=>({type:'show',data:s})),...episodes.map(e=>({type:'episode',data:e}))];
  const picked=allItems[Math.floor(Math.random()*allItems.length)];
  // If it's a manually added episode, always play it regardless of blocked seasons
  if(picked.type==='episode'){
    const ep=picked.data;
    showToast('EPISODE: '+(ep.name||'').toUpperCase().slice(0,14)+'...');
    // Navigate to the show and highlight this episode
    const r=await fetch(`https://api.themoviedb.org/3/tv/${ep.showId}?api_key=${KEY}`);
    const show=await r.json();
    currentType='tv';currentShow=show;currentNav='shows';
    blockedSeasons=new Set();selectedSeason=null;allEpisodes={};
    // Pre-load the season so the episode is available
    const sr=await fetch(`https://api.themoviedb.org/3/tv/${ep.showId}/season/${ep.seasonNum}?api_key=${KEY}`);
    const sd=await sr.json();
    allEpisodes[ep.seasonNum]=sd.episodes||[];
    const fullEp=allEpisodes[ep.seasonNum].find(e=>e.episode_number===ep.episode_number);
    highlightedEps=fullEp?[{...fullEp,seasonNum:ep.seasonNum}]:[];
    document.getElementById('search-input').value=show.name||'';
    ['shows','playlist','options'].forEach(n=>{
      const el=document.getElementById('nav-'+n);
      if(el) el.classList.toggle('active',n==='shows');
    });
    await loadSeasons(show.id);
    return;
  }
  const show=picked.data;
  showToast('SHUFFLING '+((show.name||show.title||'').toUpperCase()).slice(0,15)+'...');
  const type=show.release_date?'movie':'tv';
  if(type==='movie'){
    currentType='movie';currentShow=show;
    ['shows','playlist','options'].forEach(n=>{
      const el=document.getElementById('nav-'+n);
      if(el) el.classList.toggle('active',n==='shows');
    });
    currentNav='shows';
    renderMovieMain(show);
  } else {
    currentType='tv';currentShow=show;
    currentNav='shows';
    blockedSeasons=new Set();selectedSeason=null;allEpisodes={};highlightedEps=[];
    document.getElementById('search-input').value=show.name||'';
    ['shows','playlist','options'].forEach(n=>{
      const el=document.getElementById('nav-'+n);
      if(el) el.classList.toggle('active',n==='shows');
    });
    await loadSeasons(show.id);
    renderMain(true);
  }
}

let yourShowPopupContext=null;
let openYourShowPopupKey=null;

function yourShowPopupKey(pi,si){
  return`${pi}:${si}`;
}

function closeYourShowPopup(){
  openYourShowPopupKey=null;
  yourShowPopupContext=null;
  const popup=document.getElementById('your-show-popup');
  if(popup){
    popup.hidden=true;
    delete popup.dataset.accordionBound;
  }
}

function buildYourShowPopupDescriptionHtml(overview){
  const text=String(overview||'').trim();
  if(!text)return'';
  return`<div class="your-show-popup-overview">${escapeHtml(text)}</div>`;
}

function buildYourShowPopupEpRowHtml(ep){
  const meta=[];
  if(ep.vote_average>0) meta.push(ep.vote_average.toFixed(1)+'/10');
  if(ep.runtime) meta.push(ep.runtime+' min');
  if(ep.air_date) meta.push(ep.air_date.slice(0,4));
  return `<div class="ysp-ep-row">
    <div class="ysp-ep-header">
      <span class="ysp-ep-num">E${String(ep.episode_number).padStart(2,'0')}</span>
      <span class="ysp-ep-title">${escapeHtml(ep.name||'Episode '+ep.episode_number)}</span>
    </div>
    ${meta.length?`<div class="ysp-ep-meta">${meta.join(' · ')}</div>`:''}
    ${ep.overview?`<div class="ysp-ep-overview">${escapeHtml(ep.overview)}</div>`:''}
  </div>`;
}

function buildYourShowPopupEpisodeListHtml(episodes){
  return`<div class="your-show-popup-season-episodes">${(episodes||[]).map(ep=>buildYourShowPopupEpRowHtml(ep)).join('')}</div>`;
}

function buildYourShowPopupSeasonAccordionHtml(){
  const ctx=yourShowPopupContext;
  if(!ctx?.seasons?.length)return'<div class="pl-drawer-empty">No seasons found.</div>';
  const expanded=ctx.expandedSeason;
  const loading=ctx.loadingSeason;
  const cache=ctx.episodeCache||{};
  return ctx.seasons.map(s=>{
    const num=s.season_number;
    const isExpanded=expanded===num;
    let bodyHtml='';
    if(isExpanded){
      if(loading===num){
        bodyHtml='<div class="your-show-popup-season-loading">Loading...</div>';
      }else if(num in cache){
        bodyHtml=buildYourShowPopupEpisodeListHtml(cache[num]);
      }
    }
    return`<div class="your-show-popup-season-block${isExpanded?' your-show-popup-season-block--expanded':''}">
      <div class="your-show-popup-season-row your-show-popup-season-header" data-season="${num}" role="button" tabindex="0">
        <span class="your-show-popup-season-label">Season ${num}</span>
        <span class="your-show-popup-season-chevron" aria-hidden="true">▼</span>
      </div>
      ${isExpanded?`<div class="your-show-popup-season-body">${bodyHtml}</div>`:''}
    </div>`;
  }).join('');
}

function refreshYourShowPopupSeasonList(){
  const list=document.querySelector('#your-show-popup .your-show-popup-season-list');
  if(!list||!yourShowPopupContext)return;
  list.innerHTML=buildYourShowPopupSeasonAccordionHtml();
}

async function toggleYourShowPopupSeason(seasonNum){
  console.log('[Shufflr] toggleYourShowPopupSeason called', seasonNum, yourShowPopupContext);
  const ctx=yourShowPopupContext;
  if(!ctx||!ctx.tmdbId)return;
  if(ctx.expandedSeason===seasonNum){
    ctx.expandedSeason=null;
    ctx.loadingSeason=null;
    refreshYourShowPopupSeasonList();
    return;
  }
  ctx.expandedSeason=seasonNum;
  if(ctx.episodeCache[seasonNum]){
    ctx.loadingSeason=null;
    refreshYourShowPopupSeasonList();
    return;
  }
  ctx.loadingSeason=seasonNum;
  refreshYourShowPopupSeasonList();
  try{
    const r=await fetch(`https://api.themoviedb.org/3/tv/${ctx.tmdbId}/season/${seasonNum}?api_key=${KEY}`);
    const d=await r.json();
    if(yourShowPopupContext!==ctx)return;
    ctx.episodeCache[seasonNum]=d.episodes||[];
  }catch(e){
    console.error(e);
    if(yourShowPopupContext!==ctx)return;
    ctx.episodeCache[seasonNum]=[];
  }
  if(yourShowPopupContext!==ctx)return;
  ctx.loadingSeason=null;
  refreshYourShowPopupSeasonList();
}

function bindYourShowPopupAccordion(popup){
  if(popup.dataset.accordionBound)return;
  popup.dataset.accordionBound='true';
  popup.addEventListener('click',e=>{
    const header=e.target.closest('.your-show-popup-season-header');
    if(!header||!popup.contains(header))return;
    e.stopPropagation();
    const season=parseInt(header.dataset.season,10);
    if(Number.isFinite(season))void toggleYourShowPopupSeason(season);
  });
}

function positionYourShowPopup(pi,si){
  const popup=document.getElementById('your-show-popup');
  const card=document.querySelector(`.your-show-card[data-show-playlist-index="${pi}"][data-show-index="${si}"]`);
  const section=popup?.closest('.your-shows-section');
  if(!popup||!card||!section)return;
  const cardRect=card.getBoundingClientRect();
  const sectionRect=section.getBoundingClientRect();
  popup.style.left=`${Math.round(cardRect.right-sectionRect.left+8)}px`;
}

function buildYourShowPopupTitleHtml(displayName,posterPath){
  const posterUrl=buildPosterUrl(posterPath,'w92');
  const posterHtml=posterUrl
    ?`<img class="your-show-popup-poster" src="${escapeHtml(posterUrl)}" alt="" onerror="this.remove()" />`
    :'';
  return`<div class="your-show-popup-title-row pl-drawer-title">${posterHtml}<span class="your-show-popup-title-text">${escapeHtml(displayName)}</span></div>`;
}

function renderYourShowPopup(showName,seasons,posterPath,overview){
  const popup=document.getElementById('your-show-popup');
  if(!popup)return;
  const displayName=stripServiceSuffixFromShowName(showName);
  popup.innerHTML=`
    <button type="button" class="pl-drawer-close" onclick="event.stopPropagation(); closeYourShowPopup()" aria-label="Close">✕</button>
    ${buildYourShowPopupTitleHtml(displayName,posterPath)}
    ${buildYourShowPopupDescriptionHtml(overview)}
    <div class="pl-drawer-actions">
      <button type="button" class="pl-drawer-btn pl-drawer-btn-primary your-show-popup-shuffle" onclick="event.stopPropagation(); launchYourShowPopupShuffle()">▶ Play</button>
    </div>
    <div class="ysp-seasons-scroll">
      <div class="your-show-popup-seasons-label">SEASONS</div>
      <div class="your-show-popup-season-list">${buildYourShowPopupSeasonAccordionHtml()}</div>
    </div>`;
  bindYourShowPopupAccordion(popup);
  popup.hidden=false;
}

async function toggleYourShowPopup(pi,si){
  const key=yourShowPopupKey(pi,si);
  if(openYourShowPopupKey===key){
    closeYourShowPopup();
    return;
  }
  await openYourShowPopup(pi,si);
}

async function openYourShowPopup(pi,si){
  const show=playlists[pi]?.shows?.[si];
  if(!show)return;
  closePlaylistDrawer();
  const showName=getShowLabel(show)||show.name||show.title||'';
  const maxId=getShowMaxId(show);
  let tmdbId=show?.id!=null&&/^\d+$/.test(String(show.id))?String(show.id):null;
  let posterPath=show.poster_path||null;
  let overview='';
  if(!tmdbId){
    const query=stripServiceSuffixFromShowName(showName);
    if(!query){
      showToast('NO SHOW NAME');
      return;
    }
    showToast('LOADING '+query.toUpperCase().slice(0,15)+'...');
    try{
      const r=await fetch(`https://api.themoviedb.org/3/search/tv?api_key=${KEY}&query=${encodeURIComponent(query)}`);
      const d=await r.json();
      const match=(d.results||[])[0];
      if(!match?.id){
        showToast('NO TMDB MATCH');
        return;
      }
      tmdbId=String(match.id);
      if(match.poster_path)posterPath=match.poster_path;
    }catch(e){
      console.error(e);
      showToast('SEARCH FAILED');
      return;
    }
  }
  let seasons=[];
  try{
    const r=await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${KEY}`);
    const d=await r.json();
    seasons=(d.seasons||[]).filter(s=>s.season_number>0&&s.episode_count>0);
    if(d.poster_path)posterPath=d.poster_path;
    overview=String(d.overview||'').trim();
  }catch(e){
    console.error(e);
    showToast('FAILED TO LOAD SEASONS');
  }
  yourShowPopupContext={
    pi,si,show,showName,seasons,maxId,tmdbId,overview,posterPath,
    episodeCache:{},
    expandedSeason:null,
    loadingSeason:null,
  };
  console.log('[Shufflr] yourShowPopupContext set', yourShowPopupContext);
  openYourShowPopupKey=yourShowPopupKey(pi,si);
  renderYourShowPopup(showName,seasons,posterPath,overview);
  positionYourShowPopup(pi,si);
}

function launchYourShowPopupShuffle(){
  if(!yourShowPopupContext)return;
  const{show,maxId}=yourShowPopupContext;
  const launchUrl=getShowMaxUrlFromPlaylistShow(show)||(maxId?`https://play.max.com/show/${String(maxId)}`:null);
  if(!launchUrl){
    showToast('NO MAX URL');
    return;
  }
  closeYourShowPopup();
  setStandaloneLaunchViaBridge(launchUrl,maxId,null);
  window.open(launchUrl,'_blank');
}

async function openYourShowDetailPage(pi,si){
  const show=playlists[pi]?.shows?.[si];
  if(!show)return;
  const hasTmdbId=show?.id!=null&&/^\d+$/.test(String(show.id));

  if(hasTmdbId){
    await _loadShow(show);
    return;
  }

  const query=stripServiceSuffixFromShowName(getShowLabel(show));
  if(!query){
    showToast('NO SHOW NAME');
    return;
  }
  showToast('LOADING '+query.toUpperCase().slice(0,15)+'...');
  try{
    const r=await fetch(`https://api.themoviedb.org/3/search/tv?api_key=${KEY}&query=${encodeURIComponent(query)}`);
    const d=await r.json();
    const match=(d.results||[])[0];
    if(!match){
      showToast('NO TMDB MATCH');
      return;
    }
    currentNav='shows';
    ['shows','playlist','options'].forEach(n=>{
      const el=document.getElementById('nav-'+n);
      if(el) el.classList.toggle('active',n==='shows');
    });
    await _loadShow(match);
  }catch(e){
    console.error(e);
    showToast('SEARCH FAILED');
  }
}

// PLAYLIST MODAL
function getShowMaxId(show){
  return show?.maxId||show?.maxShowId||show?.max_id||null;
}
function getShowLabel(show){
  return (show?.title||show?.name||show?.original_name||'').trim();
}
function normalizePlShowName(name){
  return String(name||'').toLowerCase().replace(/[^a-z0-9]+/g,'');
}
function showsMatchForMaxIdLookup(targetShow,entry){
  if(!getShowMaxId(entry))return false;
  if(targetShow?.id!=null&&entry?.id!=null&&String(targetShow.id)===String(entry.id))return true;
  const targetName=normalizePlShowName(targetShow?.name||targetShow?.title);
  const entryName=normalizePlShowName(getShowLabel(entry));
  return !!(targetName&&entryName&&targetName===entryName);
}
function isShowInPlaylist(playlist,show){
  return (playlist?.shows||[]).some(s=>{
    if(show?.id!=null&&s?.id!=null&&s.id===show.id)return true;
    const maxId=getShowMaxId(s);
    if(maxId&&show?.maxId&&String(maxId)===String(show.maxId))return true;
    const nameA=normalizePlShowName(show?.name||show?.title);
    const nameB=normalizePlShowName(getShowLabel(s));
    return !!(nameA&&nameB&&nameA===nameB);
  });
}
function escapeHtml(text){
  return String(text||'')
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}
function findMaxIdEntryForShow(allPlaylists,targetShow){
  if(!Array.isArray(allPlaylists)||!targetShow)return null;
  for(const playlist of allPlaylists){
    for(const show of (playlist?.shows||[])){
      if(!showsMatchForMaxIdLookup(targetShow,show))continue;
      const maxId=getShowMaxId(show);
      if(!maxId)continue;
      return {
        title:getShowLabel(show)||getShowLabel(targetShow)||'Show',
        maxId:String(maxId),
      };
    }
  }
  return null;
}
async function resolveMaxIdEntryForShow(targetShow){
  const storedPlaylists=await readPlaylistsFromChromeStorage();
  return findMaxIdEntryForShow(storedPlaylists||playlists,targetShow);
}
function dismissPlaylistMaxNotice(){
  const el=document.getElementById('playlist-max-notice');
  if(el)el.hidden=true;
}
function showPlaylistMaxNotice(showName){
  const el=document.getElementById('playlist-max-notice');
  if(!el)return;
  const label=escapeHtml(showName||'this show');
  el.innerHTML=`<div class="playlist-max-notice-body">
    <p>To add <strong>${label}</strong> to a playlist, visit its page on Max and click <strong>▾ → +</strong> in the Shufflr button. Once added once, you can add it to any playlist here.</p>
    <button type="button" class="playlist-max-notice-dismiss" onclick="dismissPlaylistMaxNotice()" aria-label="Dismiss">✕</button>
  </div>`;
  el.hidden=false;
}
function readPlaylistsFromChromeStorage(){
  return new Promise(resolve=>{
    try{
      if(typeof chrome==='undefined'||!chrome.storage?.local){
        resolve(null);
        return;
      }
      chrome.storage.local.get(SHUFFLR_PLAYLISTS_KEY,result=>{
        const stored=result?.[SHUFFLR_PLAYLISTS_KEY];
        resolve(Array.isArray(stored)?stored:null);
      });
    }catch(e){
      resolve(null);
    }
  });
}
function openPlaylistModal(ep){
  _pendingEp = ep || null;
  dismissPlaylistMaxNotice();
  renderPlaylistModal();
  document.getElementById('playlist-modal').classList.add('open');
}
function closePlaylistModal(){
  dismissPlaylistMaxNotice();
  document.getElementById('playlist-modal').classList.remove('open');
}
function renderPlaylistModal(){
  // Update modal subtitle to reflect what we're adding
  const sub=document.querySelector('.playlist-card-sub');
  if(sub){
    if(_pendingEp){
      const code=`S${String(_pendingEp.season_number||_pendingEp.seasonNum||'').padStart(2,'0')} E${String(_pendingEp.episode_number||'').padStart(2,'0')}`;
      sub.textContent=`Adding episode: ${code} — ${_pendingEp.name||''}`;
    } else {
      sub.textContent='Choose a playlist or create a new one.';
    }
  }
  document.getElementById('playlist-modal-list').innerHTML=playlists.length
    ?playlists.map((p,i)=>{
      // Check already-added differently for episodes vs shows
      let has=false;
      if(_pendingEp){
        has=(p.episodes||[]).some(e=>e.showId===currentShow?.id&&e.episode_number===_pendingEp.episode_number&&e.seasonNum===(_pendingEp.seasonNum||_pendingEp.season_number));
      } else {
        has=isShowInPlaylist(p,currentShow);
      }
      const count=(p.shows||[]).length+(p.episodes||[]).length;
      return `<div class="playlist-modal-row" onclick="addToPlaylist(${i})">
        <div><div class="playlist-modal-row-name">${p.name}</div><div class="playlist-modal-row-count">${count} item${count!==1?'s':''}</div></div>
        ${has?'<span style="color:var(--blue);font-size:0.75rem;font-weight:700;">Added</span>':''}
      </div>`;}).join('')
    :'<div style="color:var(--muted);font-size:0.8rem;padding:8px 0;">No playlists yet. Create one below.</div>';
}
async function addToPlaylist(i){
  if(!currentShow)return;
  if(_pendingEp){
    // Add individual episode — manuallyAdded:true so blocked seasons don't filter it
    if(!playlists[i].episodes) playlists[i].episodes=[];
    const epEntry={
      showId:currentShow.id,
      showName:currentShow.name||currentShow.title||'',
      showPoster:currentShow.poster_path||'',
      episode_number:_pendingEp.episode_number,
      seasonNum:_pendingEp.seasonNum||_pendingEp.season_number,
      name:_pendingEp.name||'',
      overview:_pendingEp.overview||'',
      vote_average:_pendingEp.vote_average||0,
      runtime:_pendingEp.runtime||0,
      manuallyAdded:true,
    };
    const already=playlists[i].episodes.some(e=>e.showId===epEntry.showId&&e.episode_number===epEntry.episode_number&&e.seasonNum===epEntry.seasonNum);
    if(!already) playlists[i].episodes.push(epEntry);
    savePlaylists();
    renderPlaylistModal();
    showToast('EPISODE ADDED TO '+playlists[i].name.toUpperCase().slice(0,10));
    return;
  }

  if(!playlists[i].shows) playlists[i].shows=[];
  if(isShowInPlaylist(playlists[i],currentShow)){
    renderPlaylistModal();
    showToast('Already in '+playlists[i].name);
    return;
  }

  const maxIdEntry=await resolveMaxIdEntryForShow(currentShow);

  if(maxIdEntry){
    dismissPlaylistMaxNotice();
    playlists[i].shows.push({title:maxIdEntry.title,maxId:maxIdEntry.maxId});
    savePlaylists();
    renderPlaylistModal();
    showToast('Added '+maxIdEntry.title+' to '+playlists[i].name);
    if(currentType==='tv')renderMain();
    else renderMovieMain(currentShow);
    return;
  }

  showPlaylistMaxNotice(getShowLabel(currentShow)||'this show');
}
async function createPlaylist(){
  const input=document.getElementById('new-playlist-input');
  const name=input.value.trim();
  if(!name)return;
  const newP={
    name,
    shows:[],
    episodes:[],
    // Tag playlist with service — hardcoded to 'max' until multi-service support is added.
    service: 'max',
  };
  if(_pendingEp&&currentShow){
    newP.episodes.push({
      showId:currentShow.id,
      showName:currentShow.name||currentShow.title||'',
      showPoster:currentShow.poster_path||'',
      episode_number:_pendingEp.episode_number,
      seasonNum:_pendingEp.seasonNum||_pendingEp.season_number,
      name:_pendingEp.name||'',
      overview:_pendingEp.overview||'',
      vote_average:_pendingEp.vote_average||0,
      runtime:_pendingEp.runtime||0,
      manuallyAdded:true,
    });
  } else if(currentShow){
    const maxIdEntry=await resolveMaxIdEntryForShow(currentShow);
    if(!maxIdEntry){
      showPlaylistMaxNotice(getShowLabel(currentShow)||'this show');
      return;
    }
    dismissPlaylistMaxNotice();
    newP.shows.push({title:maxIdEntry.title,maxId:maxIdEntry.maxId});
  }
  playlists.push(newP);
  savePlaylists();
  input.value='';
  renderPlaylistModal();
  showToast('PLAYLIST CREATED');
  if(currentShow&&!_pendingEp){if(currentType==='tv')renderMain();else renderMovieMain(currentShow);}
}

// UTILS
function ensurePlaylistNameModal() {
  if (document.getElementById('shufflr-pl-name-modal')) return;
  const modal = document.createElement('div');
  modal.id = 'shufflr-pl-name-modal';
  modal.className = 'shufflr-pl-name-modal';
  modal.innerHTML = `
    <div class="shufflr-pl-name-modal-box" role="dialog" aria-modal="true" aria-labelledby="shufflr-pl-name-title">
      <div class="shufflr-pl-name-modal-title" id="shufflr-pl-name-title">NEW PLAYLIST</div>
      <label class="shufflr-pl-name-modal-label" id="shufflr-pl-name-label" for="shufflr-pl-name-input">Playlist name:</label>
      <input type="text" class="shufflr-pl-name-modal-input" id="shufflr-pl-name-input" autocomplete="off" />
      <div class="shufflr-pl-name-modal-actions">
        <button type="button" class="shufflr-pl-name-modal-btn shufflr-pl-name-modal-btn-cancel" id="shufflr-pl-name-cancel">${t('btn.cancel')}</button>
        <button type="button" class="shufflr-pl-name-modal-btn shufflr-pl-name-modal-btn-confirm" id="shufflr-pl-name-confirm">${t('btn.confirm')}</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
}

function promptPlaylistName(message = 'Playlist name:') {
  ensurePlaylistNameModal();
  const modal = document.getElementById('shufflr-pl-name-modal');
  const input = document.getElementById('shufflr-pl-name-input');
  const confirmBtn = document.getElementById('shufflr-pl-name-confirm');
  const cancelBtn = document.getElementById('shufflr-pl-name-cancel');
  const label = document.getElementById('shufflr-pl-name-label');

  return new Promise((resolve) => {
    label.textContent = message;
    input.value = '';
    modal.classList.add('open');
    setTimeout(() => input.focus(), 0);

    const finish = (value) => {
      modal.classList.remove('open');
      confirmBtn.onclick = null;
      cancelBtn.onclick = null;
      modal.onclick = null;
      input.onkeydown = null;
      resolve(value);
    };

    confirmBtn.onclick = () => finish(input.value);
    cancelBtn.onclick = () => finish(null);
    modal.onclick = (e) => {
      if (e.target === modal) finish(null);
    };
    input.onkeydown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        finish(input.value);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        finish(null);
      }
    };
  });
}

function showMain(html){document.getElementById('main-content').innerHTML=html;}

// ---- WHERE TO WATCH ----
const STREAMING_SERVICES = [
  {id:'tubi',    name:'Tubi',         free:true,  color:'#fa5252', url:'https://tubitv.com/search/'},
  {id:'pluto',   name:'Pluto TV',     free:true,  color:'#a855f7', url:'https://pluto.tv/search#'},
  {id:'peacock', name:'Peacock',      free:true,  color:'#1d4ed8', url:'https://www.peacocktv.com/search?q='},
  {id:'plex',    name:'Plex',         free:true,  color:'#e5a00d', url:'https://watch.plex.tv/search?q='},
  {id:'netflix', name:'Netflix',      free:false, color:'#e50914', url:'https://www.netflix.com/search?q='},
  {id:'hulu',    name:'Hulu',         free:false, color:'#1ce783', url:'https://www.hulu.com/search?q='},
  {id:'disney',  name:'Disney+',      free:false, color:'#113ccf', url:'https://www.disneyplus.com/search/'},
  {id:'max',     name:'Max',          free:false, color:'#002be0', url:'https://play.max.com/search?q='},
  {id:'prime',   name:'Prime Video',  free:false, color:'#00a8e1', url:'https://www.amazon.com/s?k='},
  {id:'apple',   name:'Apple TV+',    free:false, color:'#555555', url:'https://tv.apple.com/search?term='},
  {id:'paramount',name:'Paramount+',  free:false, color:'#0064ff', url:'https://www.paramountplus.com/search/'},
  {id:'crunchyroll',name:'Crunchyroll',free:false,color:'#f47521', url:'https://www.crunchyroll.com/search?q='},
];



// ---- FREE TAB ----
let freeFilter = 'all';

const FREE_SHOWS = [
  {id:1396,  name:'Breaking Bad',          poster:'/ggFHVNu6YYI5L9pCfOacjizRGt.jpg', rating:9.5, services:[{name:'Tubi',url:'https://tubitv.com/series/500062/breaking-bad',free:true},{name:'Netflix',url:'https://www.netflix.com/search?q=breaking+bad',free:false}], type:'tv',    genre:'Drama',   overview:"A high school chemistry teacher turned methamphetamine manufacturer partners with a former student to secure his family's future after a cancer diagnosis."},
  {id:1668,  name:'Friends',               poster:'/f496cm9enuEsZkSPzCwnTESEK5s.jpg', rating:8.4, services:[{name:'Tubi',url:'https://tubitv.com/series/305920/friends',free:true},{name:'Max',url:'https://play.max.com/search?query=friends',free:false}], type:'tv',    genre:'Comedy',  overview:"Six friends navigate love, careers, and life in New York City, sharing laughs and heartaches from their favorite coffee house hangout."},
  {id:2316,  name:'The Office',            poster:'/qWnJzyZhyy74gjpSjIXWmuk0ifX.jpg', rating:8.6, services:[{name:'Tubi',url:'https://tubitv.com/series/300829/the-office',free:true},{name:'Peacock',url:'https://www.peacocktv.com/search?q=the+office',free:false}], type:'tv',    genre:'Comedy',  overview:"A mockumentary-style look at the everyday lives of office employees at the Scranton, Pennsylvania branch of the Dunder Mifflin Paper Company."},
  {id:63174, name:'Lucifer',               poster:'/4EYPN5mVIhKLfxGruy7Dy41dTVn.jpg', rating:8.1, services:[{name:'Tubi',url:'https://tubitv.com/series/500001/lucifer',free:true},{name:'Netflix',url:'https://www.netflix.com/search?q=lucifer',free:false}], type:'tv',    genre:'Drama',   overview:"Lucifer Morningstar, bored of being the ruler of Hell, abandons his kingdom and becomes a consultant for the LAPD in Los Angeles."},
  {id:1402,  name:'The Walking Dead',      poster:'/xf9wuDcqlUPWABZNeDKPbZkvSx4.jpg', rating:8.1, services:[{name:'Tubi',url:'https://tubitv.com/series/500034/the-walking-dead',free:true},{name:'AMC+',url:'https://www.amcplus.com/shows/the-walking-dead',free:false}], type:'tv',    genre:'Horror',  overview:"Sheriff deputy Rick Grimes leads a group of survivors in a post-apocalyptic world overrun by zombies, fighting both the undead and other desperate survivors."},
  {id:37854, name:'One Piece',             poster:'/cMD9Ygz11zjJzAovURpO75Qg7rT.jpg', rating:8.7, services:[{name:'Tubi',url:'https://tubitv.com/search/one-piece',free:true},{name:'Crunchyroll',url:'https://www.crunchyroll.com/search?q=one+piece',free:false}], type:'tv',    genre:'Anime',   overview:"Monkey D. Luffy and his pirate crew sail the Grand Line in search of the legendary treasure known as the One Piece, to become King of the Pirates."},
  {id:46260, name:'Attack on Titan',       poster:'/hTP1DtLGFamjfu8WqjnuQdP1n4i.jpg', rating:9.0, services:[{name:'Tubi',url:'https://tubitv.com/search/attack-on-titan',free:true},{name:'Crunchyroll',url:'https://www.crunchyroll.com/search?q=attack+on+titan',free:false},{name:'Hulu',url:'https://www.hulu.com/search?q=attack+on+titan',free:false}], type:'tv',    genre:'Anime',   overview:"In a world where humanity lives inside cities surrounded by enormous walls, soldiers fight giant humanoid Titans that devour humans seemingly without reason."},
  {id:60625, name:'Rick and Morty',        poster:'/gdIrmf2DdY5mgN6ycVP0XlzKzbE.jpg', rating:9.2, services:[{name:'Tubi',url:'https://tubitv.com/series/500067/rick-and-morty',free:true},{name:'Max',url:'https://play.max.com/search?query=rick+and+morty',free:false}], type:'tv',    genre:'Comedy',  overview:"An alcoholic scientist drags his good-natured grandson on dangerous and outrageous adventures across the universe and alternate dimensions."},
  {id:2190,  name:'South Park',            poster:'/9Yn6SHf3fkOGWMoGOJU31pBqTOC.jpg', rating:8.3, services:[{name:'Tubi',url:'https://tubitv.com/search/south-park',free:true},{name:'Paramount+',url:'https://www.paramountplus.com/search/',free:false}], type:'tv',    genre:'Comedy',  overview:"Four foul-mouthed fourth graders tackle controversial topics with sharp satire in the quiet mountain town of South Park, Colorado."},
  {id:1421,  name:'Modern Family',         poster:'/fGi9c9TTBeCBkd6wTZHFoOhVOqB.jpg', rating:7.9, services:[{name:'Tubi',url:'https://tubitv.com/search/modern-family',free:true},{name:'Hulu',url:'https://www.hulu.com/search?q=modern+family',free:false}], type:'tv',    genre:'Comedy',  overview:"Three families — a nuclear family, a gay couple with an adopted daughter, and an older man with a young trophy wife — navigate the hilarious challenges of modern parenthood."},
  {id:4607,  name:'Lost',                  poster:'/og6S0aTZU6YUJAbqxeKjCa3kY1E.jpg', rating:8.0, services:[{name:'Tubi',url:'https://tubitv.com/search/lost',free:true},{name:'Hulu',url:'https://www.hulu.com/search?q=lost',free:false}], type:'tv',    genre:'Drama',   overview:"Survivors of a plane crash are stranded on a mysterious tropical island filled with strange phenomena, secrets, and danger lurking at every turn."},
  {id:1622,  name:'Suits',                 poster:'/vS5GBSHuKRFa4vBqB6dWgIgCmIG.jpg', rating:8.4, services:[{name:'Tubi',url:'https://tubitv.com/search/suits',free:true},{name:'Peacock',url:'https://www.peacocktv.com/search?q=suits',free:false},{name:'Netflix',url:'https://www.netflix.com/search?q=suits',free:false}], type:'tv',    genre:'Drama',   overview:"A talented college dropout begins working as a law associate under a top attorney in New York City, despite never having attended law school."},
  {id:1100,  name:'How I Met Your Mother', poster:'/b34jPzmB0wZy7EjUZoleXOl2RRI.jpg', rating:8.3, services:[{name:'Tubi',url:'https://tubitv.com/search/how-i-met-your-mother',free:true},{name:'Hulu',url:'https://www.hulu.com/search?q=how+i+met+your+mother',free:false}], type:'tv',    genre:'Comedy',  overview:"A father recounts to his children the long, winding story of how he met their mother and the misadventures he shared with his four best friends in New York City."},
  {id:2993,  name:'Family Guy',            poster:'/q2GXGEpXVFfSE0KSmXTnkJVmkfx.jpg', rating:8.2, services:[{name:'Tubi',url:'https://tubitv.com/search/family-guy',free:true},{name:'Hulu',url:'https://www.hulu.com/search?q=family+guy',free:false}], type:'tv',    genre:'Comedy',  overview:"The dysfunctional Griffin family navigates life in Quahog, Rhode Island — featuring a talking dog, a diabolical baby, and endless cutaway gags."},
  {id:615,   name:'Futurama',              poster:'/7MOxu3bDajFvLmExonYTWkNOiRZ.jpg', rating:8.4, services:[{name:'Tubi',url:'https://tubitv.com/search/futurama',free:true},{name:'Hulu',url:'https://www.hulu.com/search?q=futurama',free:false}], type:'tv',    genre:'Comedy',  overview:"A pizza delivery boy is accidentally cryogenically frozen and wakes up 1000 years in the future, finding work at an interplanetary delivery company."},
  {id:60059, name:'The Americans',         poster:'/gej4wdB2F8yjDeKyD0T7cOF9ixS.jpg', rating:8.5, services:[{name:'Tubi',url:'https://tubitv.com/search/the-americans',free:true},{name:'Prime Video',url:'https://www.amazon.com/s?k=the+americans',free:false}], type:'tv',    genre:'Drama',   overview:"Two KGB agents posing as an ordinary American couple in suburban Washington D.C. during the Cold War balance their dangerous secret lives with raising a family."},
  {id:550,   name:'Fight Club',            poster:'/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg', rating:8.4, services:[{name:'Tubi',url:'https://tubitv.com/search/fight-club',free:true},{name:'Hulu',url:'https://www.hulu.com/search?q=fight+club',free:false}], type:'movie', genre:'Drama',   overview:"An insomniac office worker forms an underground fight club with a soap salesman, which spirals into something far more dangerous and anarchic."},
  {id:497,   name:'The Green Mile',        poster:'/velWPhVMQeQKcxggNEU8YmIo52R.jpg', rating:8.5, services:[{name:'Tubi',url:'https://tubitv.com/search/the-green-mile',free:true},{name:'Max',url:'https://play.max.com/search?query=the+green+mile',free:false}], type:'movie', genre:'Drama',   overview:"A death row corrections officer at Cold Mountain Penitentiary discovers one of his prisoners has a miraculous, supernatural gift."},
  {id:539,   name:'Psycho',                poster:'/81d8oyEFgj7FlxJqSDXWr8JH8kV.jpg', rating:8.4, services:[{name:'Tubi',url:'https://tubitv.com/movies/660351/psycho',free:true}], type:'movie', genre:'Horror',  overview:"A secretary on the run embeds herself at a remote motel run by a mysterious young man dominated by his reclusive mother in Alfred Hitchcock's masterpiece of suspense."},
  {id:694,   name:'The Shining',           poster:'/b6ko0IKC8MdYBBPkkA1aBPLe2yz.jpg', rating:8.4, services:[{name:'Tubi',url:'https://tubitv.com/search/the-shining',free:true},{name:'Max',url:'https://play.max.com/search?query=the+shining',free:false}], type:'movie', genre:'Horror',  overview:"A family heads to an isolated hotel for the winter, where a sinister presence influences the father into violence, as his psychic son sees horrifying visions."},
  {id:238,   name:'The Godfather',         poster:'/3bhkrj58Vtu7enYsLagi1dPcDWR.jpg', rating:8.7, services:[{name:'Tubi',url:'https://tubitv.com/search/the-godfather',free:true},{name:'Paramount+',url:'https://www.paramountplus.com/search/',free:false}], type:'movie', genre:'Crime',   overview:"The aging patriarch of an organized crime dynasty transfers control to his reluctant youngest son, who becomes a ruthless and powerful leader."},
  {id:769,   name:'GoodFellas',            poster:'/aKuFiU82s5ISJpGZp7YkIr3kCUd.jpg', rating:8.5, services:[{name:'Tubi',url:'https://tubitv.com/search/goodfellas',free:true},{name:'Max',url:'https://play.max.com/search?query=goodfellas',free:false}], type:'movie', genre:'Crime',   overview:"The true story of Henry Hill, a street-smart kid who rises through the ranks of the New York mob under the wing of a local gangster."},
  {id:155,   name:'The Dark Knight',       poster:'/qJ2tW6WMUDux911r6m7haRef0WH.jpg', rating:8.5, services:[{name:'Tubi',url:'https://tubitv.com/search/the-dark-knight',free:true},{name:'Max',url:'https://play.max.com/search?query=the+dark+knight',free:false}], type:'movie', genre:'Action',  overview:"Batman faces the Joker, a criminal mastermind who plunges Gotham City into anarchy, forcing the Dark Knight to question everything he stands for."},
  {id:157336,name:'Interstellar',          poster:'/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg', rating:8.4, services:[{name:'Tubi',url:'https://tubitv.com/search/interstellar',free:true},{name:'Paramount+',url:'https://www.paramountplus.com/search/',free:false}], type:'movie', genre:'Sci-Fi',  overview:"A team of explorers travels through a wormhole in space in an attempt to ensure humanity's survival as Earth becomes uninhabitable."},
  {id:457,   name:'Titanic',               poster:'/9xjZS2rlVxm3rAPFEQ2SJF7J4ll.jpg', rating:7.9, services:[{name:'Tubi',url:'https://tubitv.com/movies/457982/titanic',free:true},{name:'Paramount+',url:'https://www.paramountplus.com/search/',free:false}], type:'movie', genre:'Romance', overview:"A seventeen-year-old aristocrat falls in love with a kind but poor artist aboard the ill-fated RMS Titanic on its doomed maiden voyage."},
  {id:1399,  name:'Game of Thrones',       poster:'/1XS1oqL89opfnbLl8WnZY1O1uJx.jpg', rating:9.3, services:[{name:'Pluto TV',url:'https://pluto.tv/us/on-demand/series/game-of-thrones',free:true},{name:'Max',url:'https://play.max.com/search?query=game+of+thrones',free:false}], type:'tv',    genre:'Fantasy', overview:"Nine noble families fight for control of the mythical lands of Westeros, while an ancient enemy returns after millennia in the frozen north."},
  {id:66732, name:'Stranger Things',       poster:'/49WJfeN0moxb9IPfGn8AIqMGskD.jpg', rating:8.7, services:[{name:'Pluto TV',url:'https://pluto.tv/search#stranger-things',free:true},{name:'Netflix',url:'https://www.netflix.com/search?q=stranger+things',free:false}], type:'tv',    genre:'Sci-Fi',  overview:"A group of kids in a small Indiana town uncover a government conspiracy and encounter supernatural forces after one of them mysteriously disappears."},
  {id:1433,  name:'Seinfeld',              poster:'/aCw8ONfyz3AhngVQa1E2Ss4KSUQ.jpg', rating:8.8, services:[{name:'Pluto TV',url:'https://pluto.tv/search#seinfeld',free:true},{name:'Netflix',url:'https://www.netflix.com/search?q=seinfeld',free:false}], type:'tv',    genre:'Comedy',  overview:"Jerry Seinfeld and his eccentric group of New York City friends navigate the minutiae of everyday life in this classic 'show about nothing.'"},
  {id:71146, name:'Narcos',                poster:'/rTmal9fDbwh5F0waol2hq35U4ah.jpg', rating:8.7, services:[{name:'Pluto TV',url:'https://pluto.tv/search#narcos',free:true},{name:'Netflix',url:'https://www.netflix.com/search?q=narcos',free:false}], type:'tv',    genre:'Crime',   overview:"The true story of the rise and fall of notorious Colombian drug lord Pablo Escobar and the DEA agents who hunted him across two continents."},
  {id:1434,  name:'Gossip Girl',           poster:'/eSLh9K2MWDYmRZCotFymaxI9U2p.jpg', rating:7.4, services:[{name:'Pluto TV',url:'https://pluto.tv/search#gossip-girl',free:true},{name:'Max',url:'https://play.max.com/search?query=gossip+girl',free:false}], type:'tv',    genre:'Drama',   overview:"An anonymous blogger known as Gossip Girl chronicles the scandalous lives of privileged teens on Manhattan's Upper East Side."},
  {id:30984, name:'Naruto',                poster:'/xppeysfvDKVx775MFuH8Z9hyABj.jpg', rating:8.4, services:[{name:'Pluto TV',url:'https://pluto.tv/search#naruto',free:true},{name:'Crunchyroll',url:'https://www.crunchyroll.com/search?q=naruto',free:false},{name:'Hulu',url:'https://www.hulu.com/search?q=naruto',free:false}], type:'tv',    genre:'Anime',   overview:"A young ninja with a powerful demon fox sealed inside him dreams of becoming the greatest ninja in his village, earning respect through hard work and determination."},
  {id:27205, name:'Inception',             poster:'/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg', rating:8.4, services:[{name:'Pluto TV',url:'https://pluto.tv/search#inception',free:true},{name:'Max',url:'https://play.max.com/search?query=inception',free:false}], type:'movie', genre:'Sci-Fi',  overview:"A thief who steals corporate secrets through dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O."},
  {id:475557,name:'Joker',                 poster:'/udDclJoHjfjb8Ekgsd4FDteOkCU.jpg', rating:8.2, services:[{name:'Pluto TV',url:'https://pluto.tv/search#joker',free:true},{name:'Max',url:'https://play.max.com/search?query=joker',free:false}], type:'movie', genre:'Drama',   overview:"Failed stand-up comedian Arthur Fleck descends into madness and becomes the infamous Joker, igniting a violent revolution in Gotham City."},
  {id:11324, name:'Shutter Island',        poster:'/52d8HgHFKsiKHFPZ7cWJGYi3NdM.jpg', rating:8.1, services:[{name:'Pluto TV',url:'https://pluto.tv/search#shutter-island',free:true},{name:'Paramount+',url:'https://www.paramountplus.com/search/',free:false}], type:'movie', genre:'Thriller',overview:"A U.S. Marshal investigates the disappearance of a patient from a hospital for the criminally insane on a remote island — and begins to question his own sanity."},
  {id:75006, name:'The Good Place',        poster:'/2owZFClFHqDAvnvAkGhEbEBYFQD.jpg', rating:8.2, services:[{name:'Peacock',url:'https://www.peacocktv.com/search?q=the+good+place',free:true},{name:'Netflix',url:'https://www.netflix.com/search?q=the+good+place',free:false}], type:'tv',    genre:'Comedy',  overview:"A selfish woman is accidentally sent to the afterlife's Good Place and must pretend to belong while actually trying to become a better person."},
  {id:8592,  name:'Parks and Recreation',  poster:'/iFHuMUBOZbfVAGBFaRcsZsqMmgN.jpg', rating:8.6, services:[{name:'Peacock',url:'https://www.peacocktv.com/search?q=parks+and+recreation',free:true},{name:'Hulu',url:'https://www.hulu.com/search?q=parks+and+recreation',free:false}], type:'tv',    genre:'Comedy',  overview:"The mockumentary follows the Parks and Recreation Department of Pawnee, Indiana and the lovably optimistic Leslie Knope as she tries to make her small town a better place."},
  {id:48891, name:'Brooklyn Nine-Nine',    poster:'/hgRMSOt7a1b8qyQR68vUixJPang.jpg', rating:8.4, services:[{name:'Peacock',url:'https://www.peacocktv.com/search?q=brooklyn+nine-nine',free:true},{name:'Hulu',url:'https://www.hulu.com/search?q=brooklyn+nine-nine',free:false}], type:'tv',    genre:'Comedy',  overview:"A talented but immature NYPD detective gets a new commanding officer — a stern, no-nonsense captain — which forces him to shape up or ship out."},
  {id:37680, name:'Downton Abbey',         poster:'/lf9sn83G0B9QpMHZXBCiTbMBoRT.jpg', rating:8.2, services:[{name:'Peacock',url:'https://www.peacocktv.com/search?q=downton+abbey',free:true},{name:'Prime Video',url:'https://www.amazon.com/s?k=downton+abbey',free:false}], type:'tv',    genre:'Drama',   overview:"The lives of the aristocratic Crawley family and their servants are intertwined in the grand Downton Abbey estate in early twentieth-century England."},
  {id:76479, name:'The Boys',              poster:'/stTEycfG9928HYGEISKFauu24V.jpg',  rating:8.7, services:[{name:'Peacock',url:'https://www.peacocktv.com/search?q=the+boys',free:true},{name:'Prime Video',url:'https://www.amazon.com/s?k=the+boys',free:false}], type:'tv',    genre:'Action',  overview:"A group of vigilantes sets out to take down corrupt superheroes who abuse their powers, in a world where supes are managed by a powerful corporation."},
  {id:106,   name:'Catch Me If You Can',   poster:'/lyVfHMR4DAPG7aqVXXHgQ9FJNwD.jpg', rating:8.1, services:[{name:'YouTube',url:'https://www.youtube.com/results?search_query=catch+me+if+you+can+2002+full+movie+free+official',free:true},{name:'Peacock',url:'https://www.peacocktv.com/search?q=catch+me+if+you+can',free:false}], type:'movie', genre:'Drama',   overview:"The true story of Frank Abagnale Jr., who successfully performed cons worth millions of dollars as a Pan Am pilot, doctor, and legal prosecutor — before the age of 21."},
  {id:10696, name:'My Cousin Vinny',       poster:'/aEFCf8bXFJMfzjb0MDVj1u0Spmg.jpg', rating:7.6, services:[{name:'YouTube',url:'https://www.youtube.com/results?search_query=my+cousin+vinny+1992+full+movie+free+official',free:true},{name:'Tubi',url:'https://tubitv.com/search/my+cousin+vinny',free:true}], type:'movie', genre:'Comedy',  overview:"Two New Yorkers are arrested in rural Alabama for a murder they didn't commit, and their only hope is a brash, inexperienced cousin who recently passed the bar."},
  {id:289,   name:'Casablanca',            poster:'/5K7cOHoay2mZusSLezBOY0Qxh8a.jpg', rating:8.5, services:[{name:'YouTube',url:'https://www.youtube.com/results?search_query=casablanca+1942+full+movie+official+free',free:true},{name:'Max',url:'https://play.max.com/search?query=casablanca',free:false}], type:'movie', genre:'Classic', overview:"A cynical American expatriate struggles to decide whether to help his former lover and her fugitive husband escape from the Nazis in WWII Casablanca."},
  {id:11232, name:'Saturday Night Fever',  poster:'/qL9vgkzJCAL6SMGalrfV1bEtE8j.jpg', rating:7.5, services:[{name:'YouTube',url:'https://www.youtube.com/results?search_query=saturday+night+fever+1977+full+movie+free+official',free:true},{name:'Paramount+',url:'https://www.paramountplus.com/search/',free:false}], type:'movie', genre:'Classic', overview:"A Brooklyn teenager finds escape from his dead-end life through his extraordinary talent on the dance floor of a local disco."},
  {id:240,   name:'The Godfather Part II', poster:'/hek3koDUyRQk7FIhPXsa6mT2Zc3.jpg', rating:9.0, services:[{name:'YouTube',url:'https://www.youtube.com/results?search_query=godfather+part+2+full+movie+free+official',free:true},{name:'Paramount+',url:'https://www.paramountplus.com/search/',free:false}], type:'movie', genre:'Crime',   overview:"The early life of Vito Corleone is portrayed alongside his son Michael's expansion of the family crime empire in this celebrated sequel."},
];

// Saved free shows from searches
let savedFreeShows = JSON.parse(localStorage.getItem('shufflr_free')||'[]');

function renderFreeTab(filter){
  freeFilter = filter || freeFilter || 'all';
  const services = ['all','Tubi','Pluto TV','Peacock','Plex','YouTube'];
  const genres = ['All','Comedy','Drama','Action','Horror','Sci-Fi','Anime','Fantasy','Crime','Family'];

  let html = `<div style="margin-bottom:20px;">
    <div class="section-header" style="color:#22c55e;text-shadow:0 0 8px rgba(34,197,94,0.4);">FREE TO WATCH</div>
    <div style="font-size:0.78rem;color:var(--muted);margin-bottom:14px;">Shows and movies you can watch for free right now.</div>
    <div class="free-service-row">`;
  services.forEach(s=>{
    html+=`<button class="free-service-btn ${freeFilter===s.toLowerCase()||freeFilter===s?'active':''}"
      onclick="renderFreeTab('${s}')">${s==='all'?'All Services':s}</button>`;
  });
  html+=`</div></div>`;

  // Combine hardcoded + saved
  const allFree = [...FREE_SHOWS, ...savedFreeShows.filter(s=>!FREE_SHOWS.find(f=>f.id===s.id))];
  const filtered = freeFilter==='all'||freeFilter==='All Services'
    ? allFree
    : allFree.filter(s=>(s.services||[{name:s.service}]).some(sv=>sv.name===freeFilter));

  // Group by genre
  const genres_present = [...new Set(filtered.map(s=>s.genre))];
  genres_present.forEach(genre=>{
    const shows = filtered.filter(s=>s.genre===genre);
    html+=`<div class="section-header" style="margin-top:16px;">${genre.toUpperCase()}</div>`;
    html+=`<div style="display:flex;flex-direction:column;gap:8px;margin-bottom:16px;">`;
    shows.forEach(s=>{
      const allSvcs = s.services || [{name:s.service||'Tubi', url:s.url, free:true}];
      html+=`<div class="ep-row" style="cursor:pointer;align-items:flex-start;padding:10px 12px;" onclick="loadFreeShow(${s.id},'${s.type}')">
        <img src="https://image.tmdb.org/t/p/w185${s.poster}" onerror="this.style.background='#1a1a1a'" style="width:52px;height:76px;border-radius:6px;flex-shrink:0;object-fit:cover;" />
        <div class="ep-info" style="padding:0 10px;min-width:0;">
          <div class="ep-name" style="margin-bottom:5px;">${s.name}</div>
          <div style="display:flex;flex-wrap:wrap;align-items:center;gap:4px;margin-bottom:7px;">
            ${allSvcs.map(sv=>`<a href="${sv.url}" target="_blank" onclick="event.stopPropagation()" class="free-tab-badge ${sv.free?'free-tab-badge-free':'free-tab-badge-sub'}">${sv.name}${sv.free?'<span class="free-tab-free-tag">FREE</span>':''}</a>`).join('')}
            <span style="font-size:0.68rem;color:var(--muted);margin-left:2px;display:flex;align-items:center;gap:5px;white-space:nowrap;">
              ${s.rating?`<span>${s.rating}/10</span><span style="opacity:0.3;">·</span>`:''}
              <span>${s.genre||''}</span>
            </span>
          </div>
          <div style="font-size:0.72rem;color:var(--muted);line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${s.overview||''}</div>
        </div>
      </div>`;
    });
    html+=`</div>`;
  });

  if(!filtered.length) html+=`<div class="empty-state"><div class="empty-sub">No free shows found for this filter.</div></div>`;
  showMain(html);
}

async function loadFreeShow(id, type){
  freeScrollPos=document.getElementById('main-content').scrollTop;
  cameFromFree=true;
  if(type==='movie'){
    const r=await fetch(`https://api.themoviedb.org/3/movie/${id}?api_key=${KEY}`);
    const show=await r.json();
    currentType='movie';currentShow=show;
    // Set nav active state without triggering show restore
    ['shows','playlist','options'].forEach(n=>{
      const el=document.getElementById('nav-'+n);
      if(el) el.classList.toggle('active',n==='shows');
    });
    currentNav='shows';
    renderMovieMain(show);
  } else {
    const r=await fetch(`https://api.themoviedb.org/3/tv/${id}?api_key=${KEY}`);
    const show=await r.json();
    currentType='tv';
    currentShow=show;
    blockedSeasons=new Set();selectedSeason=null;allEpisodes={};highlightedEps=[];
    document.getElementById('search-input').value=show.name||'';
    // Set nav active state without triggering show restore
    ['shows','playlist','options'].forEach(n=>{
      const el=document.getElementById('nav-'+n);
      if(el) el.classList.toggle('active',n==='shows');
    });
    currentNav='shows';
    await loadSeasons(show.id);
  }
}

// HOME BUTTON
function goHome(){
  homeScrollPos=0;
  currentShow=null;allSeasons=[];allEpisodes={};highlightedEps=[];selectedSeason=null;
  blockedSeasons=new Set();
  lastShowNav={shows:null,movies:null};
  clearSeasonsSidebar();
  document.getElementById('search-input').value='';
  cameFromFree=false;
  renderHomeScreen(currentNav);
}

function goBackHome(){
  currentShow=null;allSeasons=[];allEpisodes={};highlightedEps=[];selectedSeason=null;
  blockedSeasons=new Set();
  clearSeasonsSidebar();
  document.getElementById('search-input').value='';
  cameFromFree=false;
  lastShowNav={shows:null,movies:null};
  const navTarget=homeNavType||currentNav||'shows';
  if(navTarget==='playlist'||navTarget==='options'){
    setNav(navTarget);
  }else{
    setNav('shows');
  }
}

// HELP
function showHelp(){
  obIndex=0;
  const s=getObSteps()[0];
  document.getElementById('ob-step').textContent=s.step;
  document.getElementById('ob-title').textContent=s.title;
  document.getElementById('ob-desc').textContent=s.desc;
  document.querySelectorAll('.onboard-dot').forEach((d,i)=>d.classList.toggle('active',i===0));
  document.querySelector('.onboard-btn').textContent=t('btn.next');
  document.getElementById('onboarding').style.display='flex';
}
function closeHelp(){
  document.getElementById('onboarding').style.display='none';
}

// HOME SCREEN
const TV_GENRES = [
  { name: 'POPULAR RIGHT NOW',    ids: [1396,66732,63174,1418,84958,60625,76479,71912], type:'tv' },
  { name: 'COMEDY',               ids: [2316,1668,4607,61818,68004,2190,1421,75006,100088], type:'tv' },
  { name: 'ACTION & ADVENTURE',   ids: [1402,76479,60059,71912,88396,63174,84958,37854], type:'tv' },
  { name: 'DRAMA',                ids: [1396,57243,79744,87108,71712,66732,63351,82856], type:'tv' },
  { name: 'ANIME',                ids: [46260,30984,37854,72636,85937,65930,70881,94664], type:'tv' },
  { name: 'CRIME & THRILLER',     ids: [1396,60735,46952,87108,79744,4489,73586,82856], type:'tv' },
  { name: 'SCI-FI & FANTASY',     ids: [1399,60625,66732,63174,84958,76479,71912,88396], type:'tv' },
  { name: 'FAMILY & KIDS',        ids: [4614,60554,38472,77169,44217,36716,75219,65798], type:'tv' },
  { name: 'REALITY & GAME SHOWS', ids: [2178,3572,4291,39342,62688,71643,44217,37680], type:'tv' },
  { name: 'HORROR',               ids: [62822,87175,95403,71712,66190,63351,90228,82856], type:'tv' },
  { name: 'DOCUMENTARY',          ids: [87108,63351,71146,96648,99785,95956,87259,67915], type:'tv' },
  { name: 'CLASSICS',             ids: [1668,2316,4607,1421,2190,2287,1622,4135], type:'tv' },
  { name: 'SUPERHERO',            ids: [61889,62285,88329,71663,67466,71912,84958,76479], type:'tv' },
  { name: 'TALK & LATE NIGHT',    ids: [2224,4573,1489,37685,68507,38472,41056,67295], type:'tv' },
  { name: 'WESTERN',              ids: [73586,77680,86831,87949,79798,67915,82856,71712], type:'tv' },
];
const MOVIE_GENRES = [
  { name: 'POPULAR MOVIES',       ids: [550,238,424,19404,497,155,680,122], type:'movie' },
  { name: 'ACTION',               ids: [27205,299536,24428,157336,76341,475557,122,155], type:'movie' },
  { name: 'COMEDY',               ids: [98,105864,120,14160,218,862,585,13],  type:'movie' },
  { name: 'DRAMA',                ids: [238,424,497,19404,389,550,637,769],   type:'movie' },
  { name: 'HORROR',               ids: [694,539,745,11232,37735,185,23193,577], type:'movie' },
  { name: 'SCI-FI',               ids: [27205,157336,49026,24428,76341,87101,329,475557], type:'movie' },
  { name: 'ANIMATION',            ids: [862,585,920,12,14,585,12444,10193],   type:'movie' },
  { name: 'THRILLER',             ids: [680,550,274,807,539,949,78,106],      type:'movie' },
  { name: 'ROMANCE',              ids: [19404,597,105864,111,401478,508965,396535,522627], type:'movie' },
  { name: 'DOCUMENTARY',          ids: [284052,12444,98,106,246655,49596,70,244786], type:'movie' },
  { name: 'CLASSICS',             ids: [238,425,769,637,389,240,429,11],      type:'movie' },
  { name: 'SUPERHERO',            ids: [299536,24428,49026,99861,284053,271110,284054,209112], type:'movie' },
];

async function fetchShow(id, type='tv'){
  try{
    const r=await fetch(`https://api.themoviedb.org/3/${type}/${id}?api_key=${KEY}&language=en-US`);
    if(!r.ok)return null;
    return await r.json();
  }catch(e){return null;}
}

// Known free streaming services
const FREE_SERVICES = [8739,2,7,257,613,1895,593,531,37,196,1796,1870,677,692,1899];
// Provider homepage fallbacks (used when no direct ID available)
const PROVIDER_HOME = {
  8:'https://www.netflix.com',
  9:'https://www.amazon.com/prime-video',
  337:'https://www.disneyplus.com',
  384:'https://play.max.com',
  15:'https://www.hulu.com',
  386:'https://tv.apple.com',
  531:'https://tubitv.com',
  257:'https://pluto.tv',
  387:'https://www.peacocktv.com',
  1855:'https://www.paramountplus.com',
  583:'https://www.crunchyroll.com',
  2:'https://www.apple.com/apple-tv-plus',
  192:'https://www.youtube.com',
};
// Provider name to deep link base URLs (search fallback)
const PROVIDER_LINKS = {
  8:'https://www.netflix.com/search?q=',
  9:'https://www.amazon.com/s?k=',
  337:'https://www.disneyplus.com/search/',
  384:'https://play.max.com/search?q=',
  15:'https://www.hulu.com/search?q=',
  386:'https://tv.apple.com/search?term=',
  531:'https://tubitv.com/search/',
  257:'https://pluto.tv/search#',
  387:'https://www.peacocktv.com/search?q=',
  1855:'https://www.paramountplus.com/search/',
  583:'https://www.crunchyroll.com/search?q=',
};

async function fetchProviders(id, type='tv', showName=''){
  try{
    const r=await fetch(`https://api.themoviedb.org/3/${type}/${id}/watch/providers?api_key=${KEY}`);
    const d=await r.json();
    const region=userRegion||'US';
    const us=(d.results||{})[region]||(d.results||{}).US||{};
    const flatrate=us.flatrate||[];
    const free=us.free||[];
    const ads=us.ads||[];
    const rent=us.rent||[];
    const buy=us.buy||[];
    const allFree=[...free,...ads].filter((v,i,a)=>a.findIndex(t=>t.provider_id===v.provider_id)===i);
    const allSub=flatrate.filter(p=>!allFree.find(f=>f.provider_id===p.provider_id));
    const allRent=rent.filter(p=>!allFree.find(f=>f.provider_id===p.provider_id)&&!allSub.find(s=>s.provider_id===p.provider_id)).slice(0,3);
    return {free:allFree, sub:allSub, flatrate:allSub, rent:allRent, link:us.link||getEpLink()};
  }catch(e){return null;}
}

function buildFallbackProviders(showName){
  return `<div class="wtw-section-label">Find this title on</div><div class="providers-wrap"><span class="provider-badge provider-sub">Max</span><span class="provider-badge provider-sub">Netflix</span><span class="provider-badge provider-sub">Hulu</span><span class="provider-badge provider-free">Tubi <span class="free-tag">FREE</span></span></div>`;
}

function buildProviderHTML(pd, showName){
  const link=(pd&&pd.link)||getEpLink();
  const allFree=[...(pd&&pd.free||[])].filter((v,i,a)=>a.findIndex(t=>t.provider_id===v.provider_id)===i);
  const allSub=((pd&&pd.flatrate)||(pd&&pd.sub)||[]).filter(p=>!allFree.find(f=>f.provider_id===p.provider_id)).slice(0,8);
  const allRent=((pd&&pd.rent)||[]).filter(p=>!allFree.find(f=>f.provider_id===p.provider_id)&&!allSub.find(s=>s.provider_id===p.provider_id)).slice(0,3);

  if(!allFree.length&&!allSub.length&&!allRent.length) return '';

  // All providers in one row under one label
  let html=`<div class="wtw-section-label">Find this title on</div><div class="providers-wrap">`;
  allFree.forEach(p=>{
    html+=`<span class="provider-badge provider-free"><img src="https://image.tmdb.org/t/p/original${p.logo_path}" onerror="this.style.display='none'" />${p.provider_name} <span class="free-tag">FREE</span></span>`;
  });
  allSub.forEach(p=>{
    html+=`<span class="provider-badge provider-sub"><img src="https://image.tmdb.org/t/p/original${p.logo_path}" onerror="this.style.display='none'" />${p.provider_name}</span>`;
  });
  allRent.forEach(p=>{
    html+=`<span class="provider-badge provider-rent"><img src="https://image.tmdb.org/t/p/original${p.logo_path}" onerror="this.style.display='none'" />${p.provider_name}</span>`;
  });
  html+=`</div>`;
  return html;
}

// renderProviders handled inline by buildProviderHTML

async function renderHomeScreen(navType){
  homeNavType = navType || currentNav || 'shows';

  let allPlaylists = playlists;
  const bridgePlaylists = await getPlaylistsFromBridge();
  if (bridgePlaylists?.length) {
    allPlaylists = bridgePlaylists;
    playlists = bridgePlaylists;
    homePlaylistsCache = bridgePlaylists;
  }

  const yourShowsSection = getActivePlaylistShowsForHome(allPlaylists);
  const yourShows = (yourShowsSection.items || []).map(item => item.show);

  let html=`<div class="home-wrap">`;

  html += await buildYourPlaylistsHtml();

  let playlistCardLookup=null;
  if(homePlaylistsCache.length){
    const connectedService=localStorage.getItem('shufflr_service')||'max';
    const filtered=homePlaylistsCache.filter(p=>(p.service||'max')===connectedService);
    if(filtered.length){
      playlistCardLookup={allPlaylists:homePlaylistsCache,filtered};
    }
  }

  html+=buildYourShowsSectionHtml(yourShowsSection);

  if(yourShows.length){
    html+=`<div class="genre-section" id="recs-section" style="margin-top:4px;">
      <div class="genre-title">${t('section.becauseYouWatched')} <span id="recs-title" style="color:var(--blue);">${(yourShows[0].name||yourShows[0].title||'').toUpperCase()}</span> --</div>
      <div class="h-scroll-wrap" id="recs-wrap">
        ${[1,2,3,4].map(()=>`<div class="ep-card-h" style="background:var(--surface);border-color:var(--border);"><div style="width:100%;height:220px;background:var(--surface2);border-radius:0;"></div><div class="ep-card-h-body"><div style="height:10px;background:var(--border);border-radius:4px;margin-bottom:6px;width:80%;"></div><div style="height:8px;background:var(--border);border-radius:4px;width:50%;"></div></div></div>`).join('')}
      </div>
    </div>`;
  }

  const recentSection=await loadRecentlyWatchedOnMaxSection(allPlaylists);
  html+=recentSection.html;
  const recentlyWatchedEntries=recentSection.entries;

  html+=`</div>`;
  stopHomeEmptyStatic();
  showMain(html);
  setTimeout(()=>{
    document.getElementById('main-content').scrollTop=homeScrollPos;
    initHomeEmptyStatic();
  },50);

  if(yourShows.length){
    resolveYourShowsPosters(yourShowsSection.items);
  }
  if(playlistCardLookup){
    resolvePlaylistCardPosters(playlistCardLookup.allPlaylists,playlistCardLookup.filtered);
  }
  if(recentlyWatchedEntries.length){
    resolveRecentlyWatchedPosters(recentlyWatchedEntries);
  }

  if(yourShows.length){
    const seed = yourShows[0];
    const seedType = seed.release_date ? 'movie' : 'tv';
    const recentIds = new Set(yourShows.map(s=>String(s.id)));
    if(!/^\d+$/.test(String(seed.id))){
      document.getElementById('recs-section')&&document.getElementById('recs-section').remove();
      return;
    }
    try{
      const r = await fetch(`https://api.themoviedb.org/3/${seedType}/${seed.id}/recommendations?api_key=${KEY}&language=en-US&page=1`);
      const d = await r.json();
      const recs = (d.results||[]).filter(s=>s.poster_path&&!recentIds.has(s.id)).slice(0,10);
      const wrap = document.getElementById('recs-wrap');
      if(!wrap) return;
      if(!recs.length){ document.getElementById('recs-section')&&document.getElementById('recs-section').remove(); return; }
      wrap.innerHTML = recs.map(s=>`
        <div class="ep-card-h" onclick="homeTileClick(${s.id},'${seedType}')">
          <img src="${IMG+'w185'+s.poster_path}" onerror="this.style.background='#1a1a1a'" style="width:100%;height:220px;object-fit:cover;background:#1a1a1a;" />
          <div class="ep-card-h-body">
            <div class="ep-card-h-name">${s.name||s.title||''}</div>
            <div class="ep-card-h-meta">${((s.first_air_date||s.release_date)||'').slice(0,4)}${s.vote_average?` · ${s.vote_average.toFixed(1)}/10`:''}</div>
          </div>
        </div>`).join('');
    }catch(e){
      document.getElementById('recs-section')&&document.getElementById('recs-section').remove();
    }
  }
}

async function renderHomeScreen_OLD(){
  // This function is replaced by the one above
  const allPlShows=playlists.flatMap(p=>p.shows);
  if(allPlShows.length){
    html+=`<div class="genre-section">
      <div class="genre-title">-- FROM YOUR PLAYLISTS --</div>
      <div class="genre-row">`;
    [...new Map(allPlShows.map(s=>[s.id,s])).values()].slice(0,8).forEach(s=>{
      html+=`<div class="show-tile" onclick="homeTileClick(${s.id},'tv')">
        <img src="${s.poster_path?IMG+'w185'+s.poster_path:''}" onerror="this.style.background='#1a1a1a'" />
        <div class="show-tile-name">${s.name||s.title||''}</div>
        <div class="show-tile-rating">${s.vote_average?s.vote_average.toFixed(1):''}</div>
      </div>`;
    });
    html+=`</div></div>`;
  }

  html+=`<div id="genre-sections"></div></div>`;
  showMain(html);

  // Load genre sections async so page loads fast
  const genreEl=document.getElementById('genre-sections');
  if(!genreEl)return;
  for(const genre of GENRES){
    const shows=await Promise.all(genre.ids.map(id=>fetchShow(id)));
    const valid=shows.filter(s=>s&&s.poster_path);
    if(!valid.length)continue;
    let ghtml=`<div class="genre-section">
      <div class="genre-title">-- ${genre.name} --</div>
      <div class="genre-row">`;
    valid.forEach(s=>{
      ghtml+=`<div class="show-tile" onclick="homeTileClick(${s.id},'tv')">
        <img src="${IMG+'w185'+s.poster_path}" onerror="this.style.background='#1a1a1a'" />
        <div class="show-tile-name">${s.name||''}</div>
        <div class="show-tile-rating">${s.vote_average?s.vote_average.toFixed(1):''}</div>
      </div>`;
    });
    ghtml+=`</div></div>`;
    if(document.getElementById('genre-sections'))
      document.getElementById('genre-sections').innerHTML+=ghtml;
  }
}

async function homeTileClick(id,type){
  if(type==='movie'){
    const r=await fetch(`https://api.themoviedb.org/3/movie/${id}?api_key=${KEY}`);
    const show=await r.json();
    currentType='movie';
    lastShowNav.movies=show;
    currentShow=show;
    renderMovieMain(show);
  } else {
    const r=await fetch(`https://api.themoviedb.org/3/tv/${id}?api_key=${KEY}`);
    const show=await r.json();
    currentType='tv';
    lastShowNav.shows=show;
    setNav('shows');
    document.getElementById('search-input').value=show.name||'';
    currentShow=show;
    blockedSeasons=new Set();selectedSeason=null;allEpisodes={};highlightedEps=[];
    recentShows=[show,...recentShows.filter(s=>s.id!==show.id)].slice(0,10);
    localStorage.setItem('shufflr_recent',JSON.stringify(recentShows));
    await loadSeasons(show.id);
  }
}

// OPTIONS
const SHUFFLR_LANGUAGES=[
  {code:'en',label:'English'},
  {code:'es',label:'Español'},
  {code:'fr',label:'Français'},
  {code:'pt',label:'Português'},
  {code:'ja',label:'日本語'},
];

function setLanguage(code){
  localStorage.setItem('shufflrLanguage',code);
  document.querySelectorAll('.options-lang-btn').forEach(btn=>{
    btn.classList.toggle('active',btn.dataset.langCode===code);
  });
  applyTranslationsToDOM();
  updateOptionsCarouselView();
}

let optionsCarouselIndex=0;
let optionsCarouselHintDismissed=false;

const OPTIONS_CAROUSEL_STEP_KEYS=[
  {step:'help.step1',title:'help.title1',desc:'help.desc1'},
  {step:'help.step2',title:'help.title2',desc:'help.desc2'},
  {step:'help.step3',title:'help.title3',desc:'help.desc3'},
  {step:'help.step4',title:'help.title4',desc:'help.desc4'},
];

function buildOptionsCarouselHtml(){
  const stepSlides=OPTIONS_CAROUSEL_STEP_KEYS.map((k,i)=>`
    <div class="options-carousel-slide" data-slide="${i+1}"${optionsCarouselIndex===i+1?'':' hidden'}>
      <div class="options-carousel-step-label" data-i18n="${k.step}">${t(k.step)}</div>
      <div class="options-carousel-title" data-i18n="${k.title}">${t(k.title)}</div>
      <div class="options-carousel-desc" data-i18n="${k.desc}">${t(k.desc)}</div>
    </div>`).join('');

  return `<div class="options-carousel-card${optionsCarouselIndex===0||optionsCarouselIndex===5?' is-hero-slide':''}" id="options-carousel">
    <div class="options-carousel-viewport">
      <div class="options-carousel-slide options-carousel-slide-intro" data-slide="0"${optionsCarouselIndex===0?'':' hidden'}>
        <div class="options-carousel-intro">
          <div class="options-carousel-smiley">${YOUR_SHOWS_SMILEY_SVG}</div>
          <div class="options-carousel-hero-text" data-i18n="greeting.hello">${t('greeting.hello')}</div>
        </div>
      </div>
      ${stepSlides}
      <div class="options-carousel-slide options-carousel-slide-outro" data-slide="5"${optionsCarouselIndex===5?'':' hidden'}>
        <div class="options-carousel-intro">
          <div class="options-carousel-smiley">${YOUR_SHOWS_SMILEY_SVG}</div>
          <div class="options-carousel-hero-text" data-i18n="greeting.thankYou">${t('greeting.thankYou')}</div>
        </div>
      </div>
    </div>
    <div class="options-carousel-nav">
      <button type="button" class="options-carousel-arrow options-carousel-back" onclick="goOptionsCarousel(-1)" aria-label="Previous">&lt;</button>
      <button type="button" class="options-carousel-arrow options-carousel-next-arrow" onclick="goOptionsCarousel(1)" aria-label="Next">&gt;</button>
      <div class="options-carousel-next-intro">
        <button type="button" class="options-carousel-next-label" onclick="goOptionsCarouselIntroNext()" data-i18n="carousel.next">${t('carousel.next')}</button>
      </div>
    </div>
  </div>`;
}

function updateOptionsCarouselView(){
  const root=document.getElementById('options-carousel');
  if(!root)return;
  root.querySelectorAll('.options-carousel-slide').forEach(slide=>{
    const slideIndex=parseInt(slide.dataset.slide,10);
    slide.hidden=slideIndex!==optionsCarouselIndex;
  });
  const backBtn=root.querySelector('.options-carousel-back');
  const nextArrow=root.querySelector('.options-carousel-next-arrow');
  const nextIntro=root.querySelector('.options-carousel-next-intro');
  const hint=root.querySelector('.options-carousel-hint');
  if(backBtn)backBtn.hidden=optionsCarouselIndex===0;
  if(nextArrow)nextArrow.hidden=optionsCarouselIndex===0||optionsCarouselIndex===5;
  if(nextIntro)nextIntro.hidden=optionsCarouselIndex!==0;
  if(hint)hint.classList.toggle('is-dismissed',optionsCarouselHintDismissed);
  root.classList.toggle('is-hero-slide',optionsCarouselIndex===0||optionsCarouselIndex===5);
}

function goOptionsCarousel(delta){
  const next=Math.max(0,Math.min(5,optionsCarouselIndex+delta));
  if(next===optionsCarouselIndex)return;
  if(delta>0&&optionsCarouselIndex===0)optionsCarouselHintDismissed=true;
  optionsCarouselIndex=next;
  updateOptionsCarouselView();
}

function goOptionsCarouselIntroNext(){
  optionsCarouselHintDismissed=true;
  goOptionsCarousel(1);
}

function renderOptionsPage(){
  const lang=getSavedLanguage();
  const langButtons=SHUFFLR_LANGUAGES.map(l=>(
    `<button type="button" class="options-lang-btn ${lang===l.code?'active':''}" data-lang-code="${l.code}" onclick="setLanguage('${l.code}')">${l.label}</button>`
  )).join('');

  const html=`<div class="options-page">
    ${buildOptionsCarouselHtml()}

    <div class="options-section">
      <div class="options-section-title" data-i18n="options.language">${t('options.language')}</div>
      <div class="options-section-body">
        <p class="options-desc" data-i18n="options.languageDesc">${t('options.languageDesc')}</p>
        <div class="options-lang-group">${langButtons}</div>
      </div>
    </div>

    <div class="options-section">
      <div class="options-section-title" data-i18n="options.account">${t('options.account')}</div>
      <div class="options-section-body">
        <div id="auth-section" class="auth-section">
          <div id="auth-logged-out">
            <input class="options-input auth-input" id="auth-email" type="email" data-i18n-placeholder="auth.email" placeholder="${t('auth.email')}" autocomplete="email" />
            <input class="options-input auth-input" id="auth-password" type="password" data-i18n-placeholder="auth.password" placeholder="${t('auth.password')}" autocomplete="current-password" />
            <div class="auth-btn-row">
              <button type="button" class="options-btn options-btn-secondary auth-btn" id="auth-signup-btn" data-i18n="btn.signUp">${t('btn.signUp')}</button>
              <button type="button" class="options-btn options-btn-secondary auth-btn" id="auth-login-btn" data-i18n="btn.logIn">${t('btn.logIn')}</button>
            </div>
          </div>
          <div id="auth-logged-in" style="display:none;">
            <div class="auth-user-email options-account-email" id="auth-user-email"></div>
            <button type="button" class="options-btn options-btn-secondary auth-btn" id="auth-logout-btn" data-i18n="btn.logOut">${t('btn.logOut')}</button>
          </div>
          <div id="auth-message" class="auth-message" style="display:none;"></div>
        </div>
      </div>
    </div>

    <div class="options-section">
      <div class="options-section-title" data-i18n="options.feedback">${t('options.feedback')}</div>
      <div class="options-section-body">
        <p class="options-desc" data-i18n="options.feedbackDesc">${t('options.feedbackDesc')}</p>
        <textarea id="options-feedback-text" class="options-textarea" data-i18n-placeholder="options.feedbackPlaceholder" placeholder="${t('options.feedbackPlaceholder')}"></textarea>
        <button type="button" class="options-btn options-btn-primary" onclick="submitOptionsFeedback()" data-i18n="btn.submit">${t('btn.submit')}</button>
      </div>
    </div>
  </div>`;

  showMain(html);
  updateOptionsCarouselView();
  document.body.focus();
  const s = document.querySelector('input[placeholder*="Search"]');
  if (s) { s.setAttribute('disabled', 'true'); setTimeout(() => s.removeAttribute('disabled'), 500); }
  if(typeof window.shufflrRefreshAuthUI==='function')window.shufflrRefreshAuthUI();
}

function submitOptionsFeedback(){
  const text=document.getElementById('options-feedback-text')?.value?.trim();
  if(!text)return;
  console.log('[Shufflr Feedback]',text);
  document.getElementById('options-feedback-text').value='';
  showToast(t('toast.feedbackSent'));
}

// SHARE PLAYLIST
function sharePlaylist(pi){
  const p=playlists[pi];
  const shows=p.shows.map(s=>s.name||s.title).join(', ');
  const text=`Check out my Shufflr playlist "${p.name}": ${shows}`;
  navigator.clipboard.writeText(text).then(()=>showToast(t('toast.playlistCopied')));
}

// DRAG TO REORDER
let dragPi=-1,dragSi=-1;
function dragStart(e,pi,si){
  dragPi=pi;dragSi=si;
  e.currentTarget.classList.add('dragging');
  e.dataTransfer.effectAllowed='move';
}
function dragOver(e){
  e.preventDefault();
  e.currentTarget.classList.add('drag-over');
  e.dataTransfer.dropEffect='move';
}
function dragLeave(e){e.currentTarget.classList.remove('drag-over');}
function dragDrop(e,pi,si){
  e.preventDefault();
  e.currentTarget.classList.remove('drag-over');
  if(dragPi!==pi||dragSi===si)return;
  const shows=playlists[pi].shows;
  const moved=shows.splice(dragSi,1)[0];
  shows.splice(si,0,moved);
  savePlaylists();
  renderPlaylistPage();
}
function dragEnd(e){e.currentTarget.classList.remove('dragging');}
function showToast(msg){
  const t=document.getElementById('share-toast');
  t.textContent=msg;t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),2000);
}
function onSearchFocus(){
  showRecent();
}
function openDropdown(){
  document.getElementById('dropdown').classList.add('open');
  document.getElementById('search-overlay').style.display='block';
}
function closeSearch(){
  const drop=document.getElementById('dropdown');
  drop.classList.remove('open');
  drop.innerHTML='';
  document.getElementById('search-overlay').style.display='none';
  document.getElementById('search-input').blur();
}
// Desktop: click outside closes dropdown; delegated card clicks
document.addEventListener('click',e=>{
  if(e.target.closest('#topbar-login-btn')){
    e.preventDefault();
    e.stopPropagation();
    triggerTopbarAuth('login');
    return;
  }
  if(e.target.closest('#topbar-signup-btn')){
    e.preventDefault();
    e.stopPropagation();
    triggerTopbarAuth('signup');
    return;
  }
  if(e.target.closest('#topbar-setup-btn')){
    e.preventDefault();
    e.stopPropagation();
    openSetupStepsFromTopbar();
    return;
  }
  if(e.target.closest('#topbar-guest-btn')){
    e.preventDefault();
    e.stopPropagation();
    continueAsGuestFromTopbar();
    return;
  }
  if(e.target.closest('#topbar-auth-zone')||e.target.closest('#topbar-signin-card'))return;
  closeTopbarSigninCard();
  if(e.target.closest('#your-show-popup'))return;
  const yourShowCard=e.target.closest('.your-show-card');
  if(yourShowCard){
    const pi=parseInt(yourShowCard.dataset.showPlaylistIndex,10);
    const si=parseInt(yourShowCard.dataset.showIndex,10);
    if(Number.isFinite(pi)&&Number.isFinite(si))toggleYourShowPopup(pi,si);
    return;
  }
  if(!e.target.closest('#your-show-popup')){
    closeYourShowPopup();
  }
  if(!e.target.closest('#pl-home-drawer')&&!e.target.closest('.pl-home-card')){
    closePlaylistDrawer();
  }
  const rwCard=e.target.closest('.recently-watched-card');
  if(rwCard){
    let url=rwCard.dataset.recentlyWatchedMaxUrl||'';
    if(!url)return;
    try{
      url=decodeURIComponent(url);
    }catch{}
    window.open(url,'_blank');
    return;
  }
  if(!e.target.closest('.search-wrap')&&!e.target.closest('#search-overlay')) closeSearch();
  if(currentNav==='playlist'&&expandedPlaylistIndex!==null){
    const card=e.target.closest('.pl-card');
    if(card?.classList.contains('expanded')&&card.contains(e.target)){
      if(e.target.closest('.pl-card-body'))return;
      if(e.target.closest('.pl-card-actions'))return;
      if(e.target.closest('.pl-card-header'))return;
    }
    if(!e.target.closest('.pl-card-header'))collapseExpandedPlaylist();
  }
});

// ---- PWA SETUP ----
// Generate manifest dynamically
const manifest = {
  name: "Shufflr",
  short_name: "Shufflr",
  description: "Random TV and Movies, Done Right",
  start_url: ".",
  display: "standalone",
  background_color: "#000000",
  theme_color: "#000000",
  orientation: "portrait-primary",
  icons: [
    {
      src: "data:image/svg+xml," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="80" fill="black"/><rect width="512" height="512" rx="80" fill="black" stroke="#23A8E0" stroke-width="16"/><polyline points="300,130 390,130 390,220" fill="none" stroke="#23A8E0" stroke-width="44" stroke-linecap="round" stroke-linejoin="round"/><line x1="122" y1="382" x2="390" y2="130" stroke="#23A8E0" stroke-width="44" stroke-linecap="round"/><polyline points="390,292 390,382 300,382" fill="none" stroke="#23A8E0" stroke-width="44" stroke-linecap="round" stroke-linejoin="round"/><line x1="270" y1="272" x2="390" y2="382" stroke="#23A8E0" stroke-width="44" stroke-linecap="round"/></svg>`),
      sizes: "512x512",
      type: "image/svg+xml",
      purpose: "any maskable"
    }
  ]
};

const manifestBlob = new Blob([JSON.stringify(manifest)], {type:'application/json'});
const manifestURL = URL.createObjectURL(manifestBlob);
document.getElementById('pwa-manifest').setAttribute('href', manifestURL);

// Apple touch icon set in HTML head as base64

// Register service worker for offline support
if('serviceWorker' in navigator) {
  const swCode = `
    const CACHE = 'shufflr-v1';
    const ASSETS = ['/'];
    self.addEventListener('install', e => {
      e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
    });
    self.addEventListener('fetch', e => {
      e.respondWith(
        caches.match(e.request).then(r => r || fetch(e.request).catch(() => caches.match('/')))
      );
    });
  `;
  const swBlob = new Blob([swCode], {type:'application/javascript'});
  const swURL = URL.createObjectURL(swBlob);
  navigator.serviceWorker.register(swURL).catch(()=>{});
}

// Show "Add to Home Screen" prompt on mobile after 30 seconds
let deferredPrompt;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredPrompt = e;
  setTimeout(() => {
    if(deferredPrompt) showInstallPrompt();
  }, 30000);
});

function showInstallPrompt() {
  const toast = document.getElementById('share-toast');
  toast.textContent = 'ADD TO HOME SCREEN';
  toast.style.cursor = 'pointer';
  toast.classList.add('show');
  toast.onclick = () => {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(() => {
      deferredPrompt = null;
      toast.classList.remove('show');
    });
  };
}

// ── TIMER SYSTEM ─────────────────────────────────────────────────────────────
function startWatching(){
  const ep = _currentSheetEp;
  if(!ep) return;
  closeEpSheet();

  // Request notification permission first
  requestNotifPermission().then(()=>{
    // TEST MODE: fixed 60s runtime, notification at 10s before end
    const runtimeMins = 1; // TEST: 1 minute
    const runtimeSecs = 60; // TEST: 60 seconds

    // Store ep info for timer display
    _timerEp = {
      name: ep.name || 'Episode',
      code: `S${String(ep.seasonNum||ep.season_number||'').padStart(2,'0')} E${String(ep.episode_number||'').padStart(2,'0')}`,
      runtime: runtimeMins,
    };

    // Find next queued episode (episode after this one in highlightedEps, or next in season)
    _timerNextEp = getNextEpisode(ep);

    // Phase 1: 60 second buffer (user finding the episode)
    startTimerPhase1(runtimeSecs);

    // Open streaming service
    window.open(getEpLink(), '_blank');
  });
}

function getNextEpisode(currentEp){
  // Look in queue first
  const queueIdx = highlightedEps.findIndex(e=>e.episode_number===currentEp.episode_number&&(e.seasonNum||e.season_number)===currentEp.seasonNum);
  if(queueIdx >= 0 && queueIdx < highlightedEps.length - 1){
    return highlightedEps[queueIdx + 1];
  }
  // Otherwise next in season
  const seasonEps = allEpisodes[currentEp.seasonNum] || [];
  const epIdx = seasonEps.findIndex(e=>e.episode_number===currentEp.episode_number);
  if(epIdx >= 0 && epIdx < seasonEps.length - 1){
    return {...seasonEps[epIdx+1], seasonNum: currentEp.seasonNum};
  }
  // Try next season
  const nextSeasonNum = (currentEp.seasonNum||1) + 1;
  const nextSeasonEps = allEpisodes[nextSeasonNum];
  if(nextSeasonEps && nextSeasonEps.length){
    return {...nextSeasonEps[0], seasonNum: nextSeasonNum};
  }
  return null;
}

function startTimerPhase1(runtimeSecs){
  _timerRuntimeSecs = runtimeSecs;
  _timerPhase = 'buffer';
  _timerStartTimestamp = Date.now();
  _timerSecondsLeft = _timerBufferSecs;
  _timerTotalSeconds = _timerBufferSecs;
  _timerNotifScheduled = false;

  document.getElementById('timer-phase-label').textContent = 'FINDING EPISODE...';
  document.getElementById('timer-sub-label').textContent = 'Starting in 10s — go find the episode now';
  document.getElementById('timer-ep-name').textContent = `${_timerEp.code} — ${_timerEp.name}`;
  document.getElementById('timer-bar').classList.add('open');

  clearInterval(_timerInterval);
  clearTimeout(_timerNotifTimeout);

  _timerInterval = setInterval(()=>tickTimer(), 500);
}

function tickTimer(){
  const now = Date.now();
  if(_timerPhase === 'buffer'){
    const elapsed = Math.floor((now - _timerStartTimestamp) / 1000);
    _timerSecondsLeft = Math.max(0, _timerBufferSecs - elapsed);
    _timerTotalSeconds = _timerBufferSecs;
    updateTimerDisplay();
    if(_timerSecondsLeft <= 0){
      // Transition to episode phase
      _timerPhase = 'episode';
      _timerStartTimestamp = Date.now();
      _timerSecondsLeft = _timerRuntimeSecs;
      _timerTotalSeconds = _timerRuntimeSecs;
      document.getElementById('timer-phase-label').textContent = 'NOW WATCHING';
      document.getElementById('timer-sub-label').textContent = `${_timerEp.runtime} min episode · Next up ready`;
      // Schedule notification using setTimeout from NOW — survives background better
      scheduleNotification(_timerRuntimeSecs - _timerNotifAt);
    }
  } else if(_timerPhase === 'episode'){
    const elapsed = Math.floor((now - _timerStartTimestamp) / 1000);
    _timerSecondsLeft = Math.max(0, _timerRuntimeSecs - elapsed);
    _timerTotalSeconds = _timerRuntimeSecs;
    updateTimerDisplay();
    if(_timerSecondsLeft <= 0){
      clearInterval(_timerInterval);
      document.getElementById('timer-bar').classList.remove('open');
    }
  }
}

function scheduleNotification(delaySecs){
  clearTimeout(_timerNotifTimeout);
  _timerNotifTimeout = setTimeout(()=>{
    fireNextEpisodeNotification();
  }, delaySecs * 1000);
}

function updateTimerDisplay(){
  const m = Math.floor(Math.abs(_timerSecondsLeft) / 60);
  const s = Math.abs(_timerSecondsLeft) % 60;
  document.getElementById('timer-display').textContent = `${m}:${String(s).padStart(2,'0')}`;
  const pct = Math.max(0, (_timerSecondsLeft / _timerTotalSeconds) * 100);
  document.getElementById('timer-progress-fill').style.width = pct + '%';
}

function cancelTimer(){
  clearInterval(_timerInterval);
  clearTimeout(_timerNotifTimeout);
  _timerInterval = null;
  _timerNotifTimeout = null;
  _timerEp = null;
  _timerNextEp = null;
  _timerPhase = null;
  document.getElementById('timer-bar').classList.remove('open');
  showToast('TIMER CANCELLED');
}

function fireNextEpisodeNotification(){
  if(!('Notification' in window) || Notification.permission !== 'granted') return;
  const nextName = _timerNextEp
    ? `Up Next: S${String(_timerNextEp.seasonNum||'').padStart(2,'0')} E${String(_timerNextEp.episode_number||'').padStart(2,'0')} — ${_timerNextEp.name||'Next Episode'}`
    : 'Your next shuffled episode is ready!';

  const notif = new Notification('Shufflr ▶', {
    body: nextName,
    icon: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="5" fill="black"/><polyline points="20,5 26,5 26,11" fill="none" stroke="#23A8E0" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><line x1="6" y1="27" x2="26" y2="5" stroke="#23A8E0" stroke-width="2.5" stroke-linecap="round"/><polyline points="26,21 26,27 20,27" fill="none" stroke="#23A8E0" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><line x1="18" y1="19" x2="26" y2="27" stroke="#23A8E0" stroke-width="2.5" stroke-linecap="round"/></svg>'),
    tag: 'shufflr-next',
    requireInteraction: true,
  });

  notif.onclick = ()=>{
    window.focus();
    notif.close();
    // Open next episode sheet if available
    if(_timerNextEp){
      openEpSheet(_timerNextEp.episode_number, _timerNextEp.seasonNum);
    }
  };
}

function askNotifPermissionOnLoad(){
  if(!('Notification' in window)){
    showToast('NOTIFICATIONS NOT SUPPORTED');
    return;
  }
  if(Notification.permission === 'granted'){
    showToast('NOTIFICATIONS ALREADY GRANTED');
    return;
  }
  if(Notification.permission === 'denied'){
    showToast('NOTIFICATIONS DENIED — CHECK SETTINGS');
    return;
  }
  setTimeout(async()=>{
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isStandalone = window.navigator.standalone;
    if(isIOS && !isStandalone){
      showToast('OPEN FROM HOME SCREEN FOR NOTIFICATIONS');
      return;
    }
    showToast('REQUESTING NOTIFICATION PERMISSION...');
    const result = await Notification.requestPermission();
    showToast('NOTIFICATIONS: '+result.toUpperCase());
  }, 2800);
}

async function requestNotifPermission(){
  if(!('Notification' in window)) return;
  if(Notification.permission === 'granted') return;
  if(Notification.permission === 'denied'){
    showToast('ENABLE NOTIFICATIONS IN SETTINGS');
    return;
  }
  // Check iOS version compatibility
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isStandalone = window.navigator.standalone;
  if(isIOS && !isStandalone){
    showToast('ADD TO HOME SCREEN FOR NOTIFICATIONS');
    await new Promise(r=>setTimeout(r,2200));
    return;
  }
  await Notification.requestPermission();
}

// iOS specific — show manual instructions after 45 seconds
setTimeout(() => {
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isStandalone = window.navigator.standalone;
  if(isIOS && !isStandalone && !localStorage.getItem('shufflr_ios_prompt')) {
    localStorage.setItem('shufflr_ios_prompt','1');
    showToast('TAP SHARE THEN ADD TO HOME SCREEN');
  }
}, 45000);

document.addEventListener('DOMContentLoaded', function() {
  updateTopbarAuthZone();
  maybeAutoOpenTopbarSigninCard();
  // ============================================================
  // SIDEBAR & TOPBAR STARS — remove: delete from here to END STARS JS
  // ============================================================
  (function() {
    function makeStarCanvas(id, container) {
      const canvas = document.createElement('canvas');
      canvas.id = id;
      canvas.style.position = 'absolute';
      canvas.style.top = '0';
      canvas.style.left = '0';
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.pointerEvents = 'none';
      canvas.style.zIndex = '0';
      container.style.position = 'relative';
      container.insertBefore(canvas, container.firstChild);

      const ctx = canvas.getContext('2d');

      function resize() {
        canvas.width = container.offsetWidth;
        canvas.height = container.offsetHeight;
      }
      resize();
      window.addEventListener('resize', resize);

      const stars = Array.from({ length: 40 }, () => ({
        x: Math.random(),
        y: Math.random(),
        r: Math.random() * 1.0 + 0.2,
        phase: Math.random() * Math.PI * 2,
        speed: Math.random() * 0.5 + 0.2
      }));

      function draw(t) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        stars.forEach(s => {
          const twinkle = 0.3 + 0.7 * Math.sin(t * s.speed * 0.001 + s.phase);
          ctx.save();
          ctx.globalAlpha = twinkle * 0.6;
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(s.x * canvas.width, s.y * canvas.height, s.r, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        });
        requestAnimationFrame(draw);
      }
      requestAnimationFrame(draw);
    }

    const sidebar = document.getElementById('sidebar');
    const topbar = document.getElementById('top-bar');
    if (topbar) makeStarCanvas('topbar-stars', topbar);
  })();
  // ============================================================
  // END STARS JS
  // ============================================================
});
