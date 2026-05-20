#!/usr/bin/env fish

set -l vscode com.microsoft.VSCode
set -l arc company.thebrowser.Browser

function get_uti -a ext
    set -l tmpfile (mktemp /tmp/duti_probe.XXXXXX."$ext")
    set -l uti (mdls -name kMDItemContentType $tmpfile | string match -r '"(.+)"' | tail -1)
    rm $tmpfile
    echo $uti
end

function set_default -a bundle_id uti role
    if test -z "$role"
        set role all
    end
    if test -n "$uti"
        duti -s $bundle_id $uti $role 2>/dev/null
    end
end

# VS Code - stable UTIs
set_default $vscode public.plain-text
set_default $vscode public.source-code
set_default $vscode public.shell-script
set_default $vscode public.c-source
set_default $vscode public.c-header
set_default $vscode public.c-plus-plus-source
set_default $vscode public.c-plus-plus-header
set_default $vscode public.objective-c-source
set_default $vscode public.objective-c-plus-plus-source
set_default $vscode public.swift-source
set_default $vscode public.python-script
set_default $vscode public.ruby-script
set_default $vscode public.php-script
set_default $vscode public.json
set_default $vscode public.yaml
set_default $vscode public.xml editor
set_default $vscode public.css
set_default $vscode public.make-source
set_default $vscode public.patch-file
set_default $vscode com.netscape.javascript-source
set_default $vscode com.sun.java-source
set_default $vscode com.apple.log
set_default $vscode net.daringfireball.markdown
set_default $vscode public.mpeg-2-transport-stream # .ts

# VS Code - dynamic UTIs (resolved at runtime)
for ext in toml rs go sql tsx jsx scss sass less lua ipynb gradle groovy cmake coffee dart dockerfile pug vue rst tex cs ps1 ini lock env editorconfig prettierrc graphql fish zsh
    set_default $vscode (get_uti $ext)
end

# Arc - SVG
set_default $arc public.svg-image
