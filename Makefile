NAME = EnhancedRecentItems
MODULES = extension.js prefs.js recentManager.js mirrorMapping.js mutex.js metadata.json stylesheet.css BidiMirroring.txt LICENSE README.md schemas

UUID = $(call getMetaData,uuid)
VERSION = $(call getMetaData,version)
SETTINGS_SCHEMA = $(call getMetaData,settings-schema)
SETTINGS_SCHEMA_FILE = $(SETTINGS_SCHEMA).gschema.xml

ZIPFILENAME = "Bundle$(NAME)_v$(VERSION).zip"
INSTALLPATH = ~/.local/share/gnome-shell/extensions/$(UUID)/

# Separate JS and non-JS modules
JS_MODULES := $(filter %.js, $(MODULES))
NO_JS_MODULES := $(filter-out %.js, $(MODULES))

getMetaData = $(shell grep "\"$(1)\":" metadata.json | sed -E "s/[ ]*\"$(1)\":[ ]*(.*)$$/\1/" | sed -E "s/[,\"]*$$//" | sed -E "s/^[\"]*//")
# getMetaData = $(shell grep "\"$(1)\"" metadata.json | sed -E "s/.*$(1)[^:]*: \"?([0-9A-Za-z]+)\"?.*/\1/")



all: schemas/gschemas.compiled generate-translations compile-locales update-readme-versions

version:
	@echo "$(NAME) - $(UUID) - $(VERSION)"

update-readme-versions:
	sed -Ei "s/BundleEnhancedRecentItems_v[0-9]+.zip/BundleEnhancedRecentItems_v$(VERSION).zip/" README.md
	sed -Ei "s@/v[0-9]+/@/v$(VERSION)/@" README.md

compile-locales:
	$(foreach file, $(wildcard locale/*/LC_MESSAGES/*.po), \
		msgfmt $(file) -o $(subst .po,.mo,$(file));)

generate-translations:
	./generate_translations.sh

update-pot:
	rm RecentItems.pot
	xgettext -L JavaScript --from-code=UTF-8 -k_ -kN_ -o RecentItems.pot *.js

update-po-files:
	$(foreach file, $(wildcard locale/*/LC_MESSAGES/*.po), \
		msgmerge --backup=none --update $(file) RecentItems.pot ;)
		
schemas/gschemas.compiled: schemas/$(SETTINGS_SCHEMA_FILE)
	glib-compile-schemas schemas

dev-install: all
	rm -rf $(INSTALLPATH)
	mkdir -p $(INSTALLPATH)
	cp -r $(MODULES) $(INSTALLPATH)

	$(foreach file, $(wildcard locale/*/LC_MESSAGES/*.mo), \
		install -D "$(file)" $(INSTALLPATH)$(file);)		
install: bundle
	unzip -o $(ZIPFILENAME) -d $(INSTALLPATH)
	glib-compile-schemas $(INSTALLPATH)/schemas
	rm $(ZIPFILENAME)

test: install
	env MUTTER_DEBUG_DUMMY_MODE_SPECS=1248x800 dbus-run-session -- gnome-shell --nested --wayland
	
dev-test: dev-install
	env MUTTER_DEBUG_DUMMY_MODE_SPECS=1248x800 dbus-run-session -- gnome-shell --nested --wayland
	# gnome-extensions enable RecentItems@lgo.io
	# gnome-extensions disable RecentItems@lgo.io
	
bundle: all
	echo "Creating temporary directory..."
	TEMP_DIR=$$(mktemp -d) ; \
	echo "Using "$$TEMP_DIR" as temporary directory" ; \
	for mod in $(JS_MODULES); do \
	  echo "Remove console.(log|debug|warn|error|trace) from JS file: "$$mod; \
	  cp $$mod $$TEMP_DIR/; \
	  sed -i '/console\.\(log\|debug\|warn\|error\|trace\)/ s/^/\/\/ /' $$TEMP_DIR/$$mod; \
	done ; \
	echo "Create the bundle from the processed JS files in TEMP_DIR"; \
	BUNDLE_DIR=$$(pwd) && cd $$TEMP_DIR && zip -r $$BUNDLE_DIR/$(ZIPFILENAME) -9r . && cd $$BUNDLE_DIR ; \
	echo "Add non-JS modules and locale files to the bundle" ; \
	zip -r $(ZIPFILENAME) $(NO_JS_MODULES) -9r locale/*/*/*.mo ; \
	echo "Cleanup: remove the temporary directory" ; \
	rm -rf $$TEMP_DIR ;
	@echo "Bundle created: "$(ZIPFILENAME)
