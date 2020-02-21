# AutoMelvorIdle
Tampermonkey script, adding more automation for Melvor Idle (https://melvoridle.com/)

If you notice that the farming automation isn't working as expected, please review its configuration inside the script.  It's safe to change any configuration values by following the instructions inside of the script.

How to use:
- Get Tampermonkey: https://www.tampermonkey.net/
- Follow the steps on the page for your browser to install it.
- On the Git page: https://github.com/Katorone/AutoMelvorIdle/blob/master/melvor.user.js
  click the 'Raw'-button (located right above the text area)
- Tampermonkey should now ask if you wish to install/update this script.
  After installing, updating or changing any configuration values, ALWAYS reload the game's page.

What it does:
  All features are optional.
  Feel free to change the settings below to your liking.
  - Auto loot during combat, even when on a different page.
    Once the amulet of looting has been found, this feature is disabled.
  - Auto buy gem gloves, automatically selling gems to pay for them.
    Unequipping the gem gloves will stop the script from buying more.
    Keep a comfortable amount of uses in reserve to avoid having to grind
    for gold after spending all of it on upgrades.
  - Auto tending fields.
    Seeds, herbs and trees can be configured to be planted by base XP,
    mastery, farming level or to replant what's there.
  - Fields will get composted when needed (mastery < 50)
  - Configuration to stop using seeds with a certain mastery.
  - Buy farming areas when they become available. (if money is available)
  - Sell Bobbys pockets automatically (regardless of gold reserves, see below)
  - Buy more bank slots when the bank is full, and there's enough gold.
  - Open birds nests and herb bags.
  - Keep a configurable amount of gold in reserve.
    Setting this amount to 0 will effectively disable the automatic top-up.
    Keep in mind that this script only automatically sells gems to pay for Gem Gloves
    All other expenses are paid from the reserves in the bank.
    This inclodes:
    - Bank slots
    - Compost
    - Farming areas
    This is a design choice because Melvor has many ways to earn gold.
    Gems are also used for crafting, meaning we don't want to sell them all the time.
  - Automatically bury bones, while keeping a reserve for crafting.

