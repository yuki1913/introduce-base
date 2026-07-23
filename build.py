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
"""
import json, re, sys, glob, os, time, urllib.parse, urllib.request
import openpyxl

HERE=os.path.dirname(os.path.abspath(__file__))
PREF={'HK-':'北海道','TH-':'東北','KT-':'関東','CH-':'中部','KN-':'近畿','CG-':'中国','SK-':'四国','KY-':'九州','OK-':'沖縄','ON-':'全国オンライン'}
CATCOLS=['支援団体','プログラム','活動拠点','使用できる施設']

def find_xlsx():
    if len(sys.argv)>1 and os.path.exists(sys.argv[1]):
        return sys.argv[1]
    xs=[f for f in glob.glob(os.path.join(HERE,'*.xlsx')) if not os.path.basename(f).startswith('~$')]
    if not xs:
        sys.exit("エラー: .xlsx が見つかりません。マスターを Excel形式でこのフォルダに保存してください。")
    xs.sort(key=os.path.getmtime, reverse=True)
    return xs[0]

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

def main():
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

    # 出力
    with open(dj,'w',encoding='utf-8') as f:
        json.dump(recs,f,ensure_ascii=False,indent=1)
    with open(os.path.join(HERE,'data.js'),'w',encoding='utf-8') as f:
        f.write('window.YSDATA = '); json.dump(recs,f,ensure_ascii=False); f.write(';\n')

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
