"""Builds the installable .vsix without npm. / Собирает установочный .vsix без npm.

Запуск: python build_vsix.py [папка_для_файла]   (по умолчанию — dist рядом с этим файлом)
Установка: code --install-extension <путь к .vsix> --force

"""
import json
import sys
import zipfile
from pathlib import Path
from xml.sax.saxutils import escape

SRC = Path(__file__).resolve().parent
FILES = ['package.json', 'extension.js', 'media/panel.js', 'media/panel.css', 'media/icon.svg']

TYPES = """<?xml version="1.0" encoding="utf-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension=".json" ContentType="application/json"/>
<Default Extension=".js" ContentType="application/javascript"/>
<Default Extension=".css" ContentType="text/css"/>
<Default Extension=".svg" ContentType="image/svg+xml"/>
<Default Extension=".vsixmanifest" ContentType="text/xml"/>
</Types>"""


def manifest(pkg):
    return f"""<?xml version="1.0" encoding="utf-8"?>
<PackageManifest Version="2.0.0" xmlns="http://schemas.microsoft.com/developer/vsx-schema/2011">
  <Metadata>
    <Identity Language="en-US" Id="{pkg['name']}" Version="{pkg['version']}" Publisher="{pkg['publisher']}"/>
    <DisplayName>{escape(pkg['displayName'])}</DisplayName>
    <Description xml:space="preserve">{escape(pkg['description'])}</Description>
    <Categories>Other</Categories>
    <Properties>
      <Property Id="Microsoft.VisualStudio.Code.Engine" Value="{pkg['engines']['vscode']}"/>
    </Properties>
  </Metadata>
  <Installation><InstallationTarget Id="Microsoft.VisualStudio.Code"/></Installation>
  <Dependencies/>
  <Assets>
    <Asset Type="Microsoft.VisualStudio.Code.Manifest" Path="extension/package.json" Addressable="true"/>
  </Assets>
</PackageManifest>"""


def main():
    pkg = json.loads((SRC / 'package.json').read_text(encoding='utf-8'))
    out_dir = Path(sys.argv[1]) if len(sys.argv) > 1 else SRC / 'dist'
    out_dir.mkdir(exist_ok=True)
    out = out_dir / f"{pkg['name']}-{pkg['version']}.vsix"
    with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
        z.writestr('[Content_Types].xml', TYPES)
        z.writestr('extension.vsixmanifest', manifest(pkg))
        for name in FILES:
            z.write(SRC / name, 'extension/' + name)
    print(out)


if __name__ == '__main__':
    main()
