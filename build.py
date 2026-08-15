#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build.py — スプレッドシート(xlsx)から data.js / data.json を再生成する。

使い方:
  1) マスターのGoogleスプレッドシートを「ファイル → ダウンロード → Microsoft Excel(.xlsx)」で
     このフォルダに保存する（ファイル名は何でもOK。最新の .xlsx を自動で使います）。
  2) このフォルダで:  python3 build.py
  3) 公開:            ./node_modules/.bin/vercel deploy --prod --yes

ポイント:
  - 既存 data.json の「住所→緯度経度」をキャッシュとして再利用するので、
    住所が変わっていない拠点は再ジオコーディングしません（速い・手動補正も保持）。
  - 写真URL / ロゴURL 列があれば image / logo として取り込みます。
  - 写真URLが空の場合は image-sources.json の公式サイト調査結果を引き継ぎます。
"""
import json, re, sys, glob, os, time, urllib.parse, urllib.request
from datetime import date
import openpyxl

HERE=os.path.dirname(os.path.abspath(__file__))
PREF={'HK-':'北海道','TH-':'東北','KT-':'関東','CH-':'中部','KN-':'近畿','CG-':'中国','SK-':'四国','KY-':'九州','OK-':'沖縄','ON-':'全国オンライン'}
CATCOLS=['支援団体','プログラム','活動拠点','使用できる施設']
DEFAULT_STATUS={'掲載推奨','条件付き掲載'}

# 一覧・ホームでは詳細原稿や出典URLを送らない。詳細ページだけが
# data-details/<ID>.json を読むため、トップと検索の初期転送量を抑えられる。
LIST_FIELDS=(
    'id','region','pref','city','name','cats','targets','intro','fieldTags',
    'useTags','status','lat','lng','image'
)
CAT_FIELD_MAP={
    'nature':['自然体験','キャンプ','宿泊研修','地域活動','農業体験','環境学習'],
    'science':['探究','科学・研究','天文','自習','学校連携','大学連携'],
    'community':['居場所','交流','相談','社会参画','ボランティア','国際交流','チームビルディング','若者支援'],
    'arts':['文化・芸術','音楽','ものづくり','発表','イベント開催','自主企画'],
    'startup':['起業','ビジネス','企業連携','キャリア教育','メンタリング','オープンイノベーション','ピッチ・発表'],
    'sports':['スポーツ'],
}
CAT_KEYS=tuple(CAT_FIELD_MAP)

def find_xlsx():
    if len(sys.argv)>1 and os.path.exists(sys.argv[1]):
        return sys.argv[1]
    xs=[f for f in glob.glob(os.path.join(HERE,'*.xlsx')) if not os.path.basename(f).startswith('~$')]
    if not xs:
        sys.exit("エラー: .xlsx が見つかりません。マスターを Excel形式でこのフォルダに保存してください。")
    xs.sort(key=os.path.getmtime, reverse=True)
    return xs[0]

# 公式サイトから拾った画像URLのうち、採用してはいけないもの。
# 実例: 岩手県の施設ページに埋め込まれた Google Static Maps の <img> をそのまま
# 取り込んだ結果、岩手県のAPIキーを当リポジトリで再公開してしまった(GitHub
# secret scanning が検知)。他人の資格情報を載せない・地図は写真ではない。
CRED_PARAM=re.compile(r'[?&](?:key|api[_-]?key|token|access[_-]?token|signature|sig|secret|password|auth)=', re.I)
MAP_TILE  =re.compile(r'(?:/maps/api/|staticmap|/vt/|tile\.openstreetmap|api\.mapbox\.com)', re.I)

def image_url_ok(url, rid=''):
    """台帳の画像URLを採用してよいか。ダメなら理由を出して False。"""
    u=str(url or '')
    if not u: return False
    if CRED_PARAM.search(u):
        print(f'  除外 {rid}: URLに他者のAPIキー/トークンが含まれるため不採用')
        return False
    if MAP_TILE.search(u):
        print(f'  除外 {rid}: 地図タイル画像は施設の写真ではないため不採用')
        return False
    if not u.startswith('https://'):
        print(f'  除外 {rid}: https 以外のURLは不採用')
        return False
    return True

def splittags(s):
    if not s: return []
    return [p.strip() for p in re.split(r'[，、,／/]+', str(s)) if p and p.strip()]

def cell(v):
    return '' if v is None else str(v).strip()

def gsi(q):
    url="https://msearch.gsi.go.jp/address-search/AddressSearch?q="+urllib.parse.quote(q)
    try:
        with urllib.request.urlopen(url,timeout=15) as r: arr=json.load(r)
        if arr:
            c=arr[0]["geometry"]["coordinates"]; return [round(c[1],6),round(c[0],6)]
    except Exception:
        return None
    return None

SKIP_ADDR=re.compile(r'固定会場なし|オンライン|対象外|会場なし|拠点なし|非公開')
def geocode(addr, pref, city):
    if not addr or SKIP_ADDR.search(addr): return None
    a=re.sub(r'〒?\d{3}-?\d{4}','',addr).strip()
    cands=[a]
    if ' ' in a or '　' in a: cands.append(re.split(r'[ 　]', a)[0])
    if pref and city and city not in ('','オンライン'): cands.append(pref+city)
    if pref: cands.append(pref)
    for c in cands:
        if not c: continue
        r=gsi(c)
        if r: return r
        time.sleep(0.12)
    return None

def list_record(r):
    out={k:r.get(k) for k in LIST_FIELDS}
    out['imageOfficial']=bool(r.get('image') and r.get('imageSourceUrl'))
    return out

def cover_key(r):
    tags=set(r.get('fieldTags') or [])
    for key in CAT_KEYS:
        if tags.intersection(CAT_FIELD_MAP[key]):
            return key
    if r.get('region')=='全国オンライン':
        return 'science'
    fallback={'支援団体':'community','プログラム':'arts','活動拠点':'nature','使用できる施設':'science'}
    for cat in r.get('cats') or []:
        if cat in fallback:
            return fallback[cat]
    return 'nature'

def home_records(recs):
    """地方ごとに3件ずつ、トップ用に選ぶ。"""
    visible=[r for r in recs if r.get('status') in DEFAULT_STATUS]
    picked=[]
    for region in PREF.values():
        pool=[r for r in visible if r.get('region')==region]
        recommended=[r for r in pool if r.get('status')=='掲載推奨']
        pool=recommended or pool
        chosen=[]; seen=set()
        for r in pool:
            key=cover_key(r)
            if key not in seen:
                chosen.append(r); seen.add(key)
            if len(chosen)==3: break
        for r in pool:
            if len(chosen)==3: break
            if r not in chosen: chosen.append(r)
        picked.extend(chosen)
    unique={}
    for r in picked:
        unique.setdefault(r['id'],r)
    counts={region:sum(1 for r in visible if r.get('region')==region) for region in PREF.values()}
    return list(unique.values()),counts

def write_outputs(recs):
    with open(os.path.join(HERE,'data.json'),'w',encoding='utf-8') as f:
        json.dump(recs,f,ensure_ascii=False,indent=1)
    with open(os.path.join(HERE,'data.js'),'w',encoding='utf-8') as f:
        f.write('window.YSDATA = '); json.dump(recs,f,ensure_ascii=False,separators=(',',':')); f.write(';\n')

    list_recs=[list_record(r) for r in recs]
    with open(os.path.join(HERE,'data-list.js'),'w',encoding='utf-8') as f:
        f.write('window.YSDATA = '); json.dump(list_recs,f,ensure_ascii=False,separators=(',',':')); f.write(';\n')

    home_recs,counts=home_records(recs)
    with open(os.path.join(HERE,'data-home.js'),'w',encoding='utf-8') as f:
        f.write('window.YSDATA = '); json.dump([list_record(r) for r in home_recs],f,ensure_ascii=False,separators=(',',':')); f.write(';\n')
        f.write('window.YSHOME_COUNTS = '); json.dump(counts,f,ensure_ascii=False,separators=(',',':')); f.write(';\n')

    detail_dir=os.path.join(HERE,'data-details')
    os.makedirs(detail_dir,exist_ok=True)
    for r in recs:
        with open(os.path.join(detail_dir,r['id']+'.json'),'w',encoding='utf-8') as f:
            json.dump(r,f,ensure_ascii=False,separators=(',',':'))

    updated=f'{date.today().year}年{date.today().month}月{date.today().day}日'
    marker=re.compile(r'(<time\s+data-updated-at(?:\s+datetime="[^"]*")?>).*?(</time>)')
    for path in glob.glob(os.path.join(HERE,'*.html')):
        with open(path,encoding='utf-8') as f: html=f.read()
        html=marker.sub(r'\1'+updated+r'\2',html)
        with open(path,'w',encoding='utf-8') as f: f.write(html)

    # 本番URLが分かる環境では、有効な絶対URLの sitemap も同時に作る。
    # SITE_ORIGIN 未設定時に推測したドメインを書かないことを優先する。
    origin=os.environ.get('SITE_ORIGIN','').strip().rstrip('/')
    if re.match(r'^https://[^/]+',origin):
        pages=['','search.html','guide.html','faq.html','teachers.html','contact.html']
        urls=''.join(f'<url><loc>{origin}/{page}</loc></url>' for page in pages)
        with open(os.path.join(HERE,'sitemap.xml'),'w',encoding='utf-8') as f:
            f.write('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+urls+'</urlset>\n')
        with open(os.path.join(HERE,'robots.txt'),'w',encoding='utf-8') as f:
            f.write(f'User-agent: *\nAllow: /\nSitemap: {origin}/sitemap.xml\n')
    else:
        print('注意: SITE_ORIGIN 未設定のため sitemap.xml は生成していません。')

    return list_recs,home_recs

def main():
    if len(sys.argv)>1 and sys.argv[1]=='--from-json':
        with open(os.path.join(HERE,'data.json'),encoding='utf-8') as f:
            recs=json.load(f)
        list_recs,home_recs=write_outputs(recs)
        print('既存 data.json から派生データを更新しました。')
        print('一覧:',len(list_recs),'件 ｜ ホーム:',len(home_recs),'件 ｜ 詳細:',len(recs),'件')
        return
    xlsx=find_xlsx()
    print("読み込み:", os.path.basename(xlsx))
    wb=openpyxl.load_workbook(xlsx, read_only=True, data_only=True)

    # 住所→緯度経度キャッシュ（既存data.jsonから）
    cache={}
    dj=os.path.join(HERE,'data.json')
    if os.path.exists(dj):
        for r in json.load(open(dj,encoding='utf-8')):
            if r.get('address') and r.get('lat') is not None:
                cache[r['address']]=[r['lat'],r['lng']]

    recs=[]
    for ws in wb.worksheets:
        rows=list(ws.iter_rows(values_only=True))
        if not rows: continue
        # ヘッダー行を探す
        hidx=None
        for i,row in enumerate(rows[:5]):
            vals=[cell(x) for x in row]
            if 'ID' in vals and '名称' in vals:
                hidx=i; header=vals; break
        if hidx is None: continue
        col={name:j for j,name in enumerate(header)}
        def g(row,name):
            j=col.get(name)
            return cell(row[j]) if (j is not None and j<len(row)) else ''
        for row in rows[hidx+1:]:
            idv=g(row,'ID')
            if not re.match(r'^[A-Z]{2}-\d+$', idv): continue
            pref=g(row,'都道府県'); city=g(row,'市区町村') or g(row,'市区町村・対象地域')
            recs.append({
                'id':idv,
                'region':PREF.get(idv[:3],''),
                'pref':pref,
                'city':city,
                'name':g(row,'名称'),
                'cats':[c for c in CATCOLS if g(row,c)=='○'],
                'targets':splittags(g(row,'主な対象')),
                'summary':g(row,'概要'),
                'intro':g(row,'中高生向け紹介文'),
                'fieldTags':splittags(g(row,'推奨タグ')),
                'useTags':splittags(g(row,'利用形態タグ')),
                'status':g(row,'掲載可否'),
                'url':g(row,'公式HP・URL'),
                'infoUrl':g(row,'詳細・情報源URL'),
                'address':g(row,'住所'),
                'station':g(row,'最寄り駅'),
                'image':g(row,'写真URL'),
                'logo':g(row,'ロゴURL'),
            })

    # 公式サイト画像の出典台帳をマージ。スプレッドシートの明示指定を優先する。
    ledger_path=os.path.join(HERE,'image-sources.json')
    if os.path.exists(ledger_path):
        try:
            with open(ledger_path,encoding='utf-8') as f:
                ledger=json.load(f)
            image_sources={x.get('id'):x for x in ledger.get('records',[])
                           if x.get('id') and x.get('image') and image_url_ok(x['image'], x.get('id'))}
            for r in recs:
                src=image_sources.get(r['id'])
                if not r['image'] and src:
                    r['image']=src['image']
                    r['imageSource']=src.get('imageSource','団体公式サイト')
                    r['imageSourceUrl']=src.get('imageSourceUrl','')
                    r['imageKind']=src.get('imageKind','official-site-image')
                    r['imageReview']=src.get('imageReview','公開前に利用条件確認')
                    r['imageCheckedAt']=src.get('checkedAt','')
        except (OSError, ValueError, TypeError) as e:
            print('注意: image-sources.json を読み込めませんでした:', e)

    # ジオコーディング（キャッシュ優先）
    new_geo=0
    for r in recs:
        addr=r['address']
        if addr in cache:
            r['lat'],r['lng']=cache[addr]
        else:
            ll=geocode(addr, r['pref'], r['city'])
            r['lat']=ll[0] if ll else None
            r['lng']=ll[1] if ll else None
            if ll: cache[addr]=ll; new_geo+=1
            time.sleep(0.1)

    # 出力（フルデータ＋初期表示用の軽量データ＋ID別詳細）
    write_outputs(recs)

    # サマリ
    from collections import Counter
    reg=Counter(r['region'] for r in recs)
    pinned=sum(1 for r in recs if r['lat'] is not None)
    img=sum(1 for r in recs if r['image'])
    logo=sum(1 for r in recs if r['logo'])
    print("―"*40)
    print("総件数:", len(recs), "｜ 地図ピン:", pinned, "｜ 新規ジオコード:", new_geo)
    print("写真URL入り:", img, "｜ ロゴURL入り:", logo)
    print("地方別:", dict(reg))
    print("―"*40)
    print("次: ./node_modules/.bin/vercel deploy --prod --yes")

if __name__=='__main__':
    main()
