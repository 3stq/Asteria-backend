import app from "../../..";
import { createSection } from "../../../utils/creationTools/createSection";
import { getVersion } from "../../../utils/handling/getVersion";

export default function () {
  app.get("/content/api/pages/fortnite-game", async (c) => {
    const ver = await getVersion(c);
    if (!ver) return c.json({ error: "Incorrect HTTP Method" });
    const section = await createSection();

    const content = {
      _title: "Fortnite Game",
      _activeDate: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      _locale: "en-US",
      tournamentinformation: {
        _activeDate: new Date().toISOString(),
        _locale: "en-US",
        _templateName: "FortniteGameTournamentInfo",
        _title: "tournamentinformation",
        conversion_config: {
          _type: "Conversion Config",
          containerName: "tournament_info",
          contentName: "tournaments",
          enableReferences: true,
        },
        lastModified: "0001-01-01T00:00:00",
        tournament_info: {
          _type: "Tournaments Info",
          tournaments: [
            {
              _type: "Tournament Display Info",
              loading_screen_image:
                "https://cdn2.unrealengine.com/s18-br-lategame2-newsheader-1900x600-4b329e68f671.jpg?resize=1&w=1920",
              playlist_tile_image:
                "https://cdn2.unrealengine.com/s18-br-lategame2-newsheader-1900x600-4b329e68f671.jpg?resize=1&w=1920",
              title_line_1: "ARENA LATEGAME",
              title_line_2: null,
              tournament_display_id: "ARENA_SOLO",
            },
            {
              loading_screen_image: "",
              poster_back_image:
                "https://cdn2.unrealengine.com/Fortnite/fortnite-game/tournaments/AlphaTournament_Solo_Back-750x1080-994abaad723dd8bd579d6c4518d5a44c9fcebc85.jpg",
              _type: "Tournament Display Info",
              pin_earned_text: "",
              tournament_display_id: "corelg",
              background_text_color: "04208F",
              poster_fade_color: "000F4A",
              secondary_color: "000F4A",
              title_color: "FFFFFF",
              background_right_color: "00F0FF",
              highlight_color: "F7FF00",
              primary_color: "FFFFFF",
              shadow_color: "04208F",
              background_left_color: "124AEC",
              base_color: "FFFFFF",
              schedule_info: "",
              flavor_description: "Get Top 5 To Earn Prizes!",
              poster_front_image:
                "https://pbs.twimg.com/media/FlrgZ12aEAMHwQI.png",
              short_format_title: "",
              title_line_2: "",
              title_line_1: "",
              details_description: "",
              long_format_title: "",
            },
          ],
        },
      },
      scoringrulesinformation: {
        scoring_rules_info: {
          _type: "Scoring Rules Info",
          scoring_rules: [
            {
              poster_description: "Loot Island Captured",
              rule_name: "MMO_LootIsland",
              _type: "Scoring Rules Display Info",
              icon: "/Game/UI/Foundation/Textures/Icons/Quest/T-Icon-Trophy-32.T-Icon-Trophy-32",
              description: "Loot Island Captured",
              hide_score_toast_notifications: false,
              poster_interval_description: "Loot Island Captured",
            },
            {
              poster_description:
                "{0}|plural(one=Each Forcast Tower Captured,other=Every {0} Forcast Tower Captures)",
              rule_name: "EACH_MMO_RadioTower",
              _type: "Scoring Rules Display Info",
              icon: "/Game/UI/Foundation/Textures/Icons/Quest/T-Icon-Trophy-32.T-Icon-Trophy-32",
              description:
                "{0}|plural(one=Each Forcast Tower Captured,other=Every {0} Forcast Tower Captures)",
              hide_score_toast_notifications: false,
              poster_interval_description: "{0} - {1} Forcast Towers Captured",
            },
            {
              poster_description:
                "{0}|plural(one=Each Vault Captured,other=Every {0} Vault Captures)",
              rule_name: "EACH_MMO_Vault",
              _type: "Scoring Rules Display Info",
              icon: "/Game/UI/Foundation/Textures/Icons/Quest/T-Icon-Trophy-32.T-Icon-Trophy-32",
              description:
                "{0}|plural(one=Each Vault Captured,other=Every {0} Vault Captures)",
              hide_score_toast_notifications: false,
              poster_interval_description: "{0} - {1} Vault Captured",
            },
            {
              poster_description:
                "{0}|plural(one=Each Cache Captured, other=Every {0} Cache Captures)",
              rule_name: "EACH_MMO_Cache",
              _type: "Scoring Rules Display Info",
              icon: "/Game/UI/Foundation/Textures/Icons/Quest/T-Icon-Trophy-32.T-Icon-Trophy-32",
              description:
                "{0}|plural(one=Each Cache Captured, other=Every {0} Cache Captures)",
              hide_score_toast_notifications: false,
              poster_interval_description: "{0} - {1} Cache Captured",
            },
            {
              poster_description: "Victory Royale",
              rule_name: "VICTORY_ROYALE_STAT",
              _type: "Scoring Rules Display Info",
              icon: "/Game/UI/Foundation/Textures/Icons/Quest/T-Icon-Trophy-32.T-Icon-Trophy-32",
              description: "Victory Royale",
              hide_score_toast_notifications: false,
              poster_interval_description: "Victory Royale",
            },
            {
              poster_description:
                "{0} {0}|plural(one=Elimination,other=Eliminations)",
              rule_name: "Eliminations",
              _type: "Scoring Rules Display Info",
              icon: "/Game/Athena/HUD/Art/killsico_alt.KillsIco_Alt",
              description: "{0} {0}|plural(one=Elimination,other=Eliminations)",
              hide_score_toast_notifications: false,
              poster_interval_description: "{0} - {1}  Eliminations",
            },
            {
              poster_description:
                "{0} {0}|plural(one=Elimination,other=Eliminations)",
              rule_name: "TEAM_ELIMS_STAT_INDEX",
              _type: "Scoring Rules Display Info",
              icon: "/Game/Athena/HUD/Art/killsico_alt.KillsIco_Alt",
              description: "{0} {0}|plural(one=Elimination,other=Eliminations)",
              hide_score_toast_notifications: false,
              poster_interval_description: "{0} - {1}  Eliminations",
            },
            {
              poster_description:
                "{0}{0}|ordinal(one=st,two=nd,few=rd,other=th) Place",
              rule_name: "Placement",
              _type: "Scoring Rules Display Info",
              icon: "/Game/UI/Foundation/Textures/Icons/Quest/T-Icon-Trophy-32.T-Icon-Trophy-32",
              description: "Reach Top {0}",
              hide_score_toast_notifications: false,
              poster_interval_description:
                "{0}{0}|ordinal(one=st,two=nd,few=rd,other=th) - {1}{1}|ordinal(one=st,two=nd,few=rd,other=th) Place",
            },
            {
              poster_description:
                "{0}|plural(one=Each Elimination,other=Every {0} Eliminations)",
              rule_name: "EachElimination",
              _type: "Scoring Rules Display Info",
              icon: "/Game/Athena/HUD/Art/killsico_alt.KillsIco_Alt",
              description:
                "{0}|plural(one=Each Elimination,other=Every {0} Eliminations)",
              hide_score_toast_notifications: false,
              poster_interval_description: "",
            },
            {
              poster_description:
                "{0}|plural(one=Each Elimination,other=Every {0} Eliminations)",
              rule_name: "EACH_CREATIVE_ELIMINATIONS_STAT",
              _type: "Scoring Rules Display Info",
              icon: "/Game/Athena/HUD/Art/killsico_alt.KillsIco_Alt",
              description:
                "{0}|plural(one=Each Elimination,other=Every {0} Eliminations)",
              hide_score_toast_notifications: false,
              poster_interval_description: "{0} - {1}  Eliminations",
            },
            {
              poster_description: "Bus Fare",
              rule_name: "MatchEntryFee",
              _type: "Scoring Rules Display Info",
              icon: "/Game/UI/Events/Icons/T-Icon-Bus-Fare-Flat.T-Icon-Bus-Fare-Flat",
              description: "Bus Fare",
              hide_score_toast_notifications: false,
            },
            {
              poster_description:
                "{0} {0}|plural(one=Bow Elimination,other=Bow Eliminations)",
              rule_name: "BowKills",
              _type: "Scoring Rules Display Info",
              icon: "/Game/Athena/HUD/Art/killsico_alt.KillsIco_Alt",
              description:
                "{0} {0}|plural(one=Bow Elimination,other=Bow Eliminations)",
              hide_score_toast_notifications: false,
              poster_interval_description: "{0} -  {1} Bow Eliminations",
            },
            {
              poster_description: "Each score of {0}",
              rule_name: "EACH_CREATIVE_SCORE_STAT",
              _type: "Scoring Rules Display Info",
              icon: "/Game/UI/Foundation/Textures/Icons/Quest/T-Icon-Trophy-32.T-Icon-Trophy-32",
              description: "Each score of {0}",
              hide_score_toast_notifications: true,
              poster_interval_description: "",
            },
            {
              poster_description: "Score of {0}",
              rule_name: "Scores",
              _type: "Scoring Rules Display Info",
              icon: "/Game/UI/Foundation/Textures/Icons/Quest/T-Icon-Trophy-32.T-Icon-Trophy-32",
              description: "Score of {0}",
              hide_score_toast_notifications: false,
              poster_interval_description: "Score of {0} - {1}",
            },
            {
              poster_description:
                "{0} {0}|plural(one=Time Eliminated,other=Times Eliminated)",
              rule_name: "EACH_CREATIVE_ELIMINATED_STAT",
              _type: "Scoring Rules Display Info",
              icon: "/Game/Athena/HUD/Art/killsico_alt.KillsIco_Alt",
              description:
                "{0} {0}|plural(one=Time Eliminated,other=Times Eliminated)",
              hide_score_toast_notifications: false,
              poster_interval_description: "{0} - {1}  Times Eliminated",
            },
            {
              poster_description:
                "{0}|plural(one=Each Damage Dealt,other=Every {0} Damage Dealt)",
              rule_name: "CREATIVE_DAMAGE_DEALT_STAT",
              _type: "Scoring Rules Display Info",
              icon: "/Game/Athena/HUD/Art/icon_health.icon_health",
              description:
                "{0}|plural(one=Each Damage Dealt,other=Every {0} Damage Dealt)",
              hide_score_toast_notifications: true,
            },
            {
              poster_description:
                "{0}|plural(one=Each Damage Taken,other=Every {0} Damage Taken)",
              rule_name: "CREATIVE_DAMAGE_TAKEN_STAT",
              _type: "Scoring Rules Display Info",
              icon: "/Game/Athena/HUD/Art/icon_health.icon_health",
              description:
                "{0}|plural(one=Each Damage Taken,other=Every {0} Damage Taken)",
              hide_score_toast_notifications: false,
            },
            {
              poster_description:
                "{0}|plural(one=Each Item Collected,other=Every {0} Items Collected)",
              rule_name: "EACH_CREATIVE_COLLECT_ITEMS_STAT",
              _type: "Scoring Rules Display Info",
              icon: "/Game/UI/Foundation/Textures/Icons/Quest/T-Icon-Trophy-32.T-Icon-Trophy-32",
              description:
                "{0}|plural(one=Each Item Collected,other=Every {0} Items Collected)",
              hide_score_toast_notifications: false,
              poster_interval_description: "{0} - {1}  Items Collected",
            },
            {
              poster_description: "Every {0} Remaining Spawn",
              rule_name: "CREATIVE_SPAWNS_LEFT_STAT",
              _type: "Scoring Rules Display Info",
              icon: "/Game/UI/Foundation/Textures/Icons/Quest/T-Icon-Trophy-32.T-Icon-Trophy-32",
              description: "Every {0} Remaining Spawn",
              hide_score_toast_notifications: false,
            },
            {
              poster_description: "Every {0} Health Remaining",
              rule_name: "CREATIVE_REMAINING_HEALTH_STAT",
              _type: "Scoring Rules Display Info",
              icon: "/Game/Athena/HUD/Art/icon_health.icon_health",
              description: "Every {0} Health Remaining",
              hide_score_toast_notifications: false,
            },
            {
              poster_description:
                "{0}|plural(one=Each Objective Completed,other=Every {0} Objectives Completed)",
              rule_name: "EACH_CREATIVE_OBJECTIVES_STAT",
              _type: "Scoring Rules Display Info",
              icon: "/Game/UI/Foundation/Textures/Icons/Quest/T-Icon-Trophy-32.T-Icon-Trophy-32",
              description:
                "{0}|plural(one=Each Each Objective Completed,other=Every {0} Objectives Completed)",
              hide_score_toast_notifications: false,
            },
            {
              poster_description:
                "{0}|plural(one=AI Elimination,other=Every {0} AI Eliminations)",
              rule_name: "EACH_CREATIVE_AI_ELIMINATIONS_STAT",
              _type: "Scoring Rules Display Info",
              icon: "/Game/Athena/HUD/Art/killsico_alt.KillsIco_Alt",
              description:
                "{0}|plural(one=AI Elimination,other=Every {0} AI Eliminations)",
              hide_score_toast_notifications: false,
              poster_interval_description: "{0} - {1}  AI Eliminated",
            },
            {
              poster_description: "{0}|plural(one=Each Assist,other=Assists)",
              rule_name: "EACH_CREATIVE_ASSISTS_STAT",
              _type: "Scoring Rules Display Info",
              icon: "/Game/Athena/HUD/Art/killsico_alt.KillsIco_Alt",
              description: "{0}|plural(one=Each Assist,other=Assists)",
              hide_score_toast_notifications: false,
              poster_interval_description: "{0} - {1}  Assists",
            },
            {
              poster_description:
                "{0}|plural(one=Each millisecond Alive ,other=Every {0} Milliseconds Alive)",
              rule_name: "EACH_CREATIVE_TIME_ALIVE_STAT",
              _type: "Scoring Rules Display Info",
              icon: "/Game/Athena/HUD/Art/icon_health.icon_health",
              description:
                "{0}|plural(one=Each millisecond Alive ,other=Every {0} Milliseconds Alive)",
              hide_score_toast_notifications: true,
            },
            {
              poster_description: "For every lap under {0} milliseconds ",
              rule_name: "CREATIVE_RACE_TIME_STAT",
              _type: "Scoring Rules Display Info",
              icon: "ns/Quest/T-Icon-Trophy-32.T-Icon-Trophy-32",
              description: "For every lap under {0} milliseconds ",
              hide_score_toast_notifications: false,
            },
          ],
        },
        _title: "scoringrulesinformation",
        _noIndex: false,
        _activeDate: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        _locale: "en-US",
        _templateName: "FortniteGameScoringRulesInfo",
      },
      playlistinformation: {
        frontend_matchmaking_header_style: "None",
        _title: "playlistinformation",
        frontend_matchmaking_header_text: "",
        playlist_info: {
          _type: "Playlist Information",
          playlists: [
            {
              image: ``,
              playlist_name: "Playlist_DefaultSolo",
              hidden: false,
              special_border: "None",
              _type: "FortPlaylistInfo",
            },
            {
              image:
                "",
              playlist_name: "Playlist_PlaygroundV2",
              hidden: false,
              special_border: "None",
              _type: "FortPlaylistInfo",
            },
            {
              image: ``,
              playlist_name: "Playlist_DefaultDuo",
              hidden: false,
              special_border: "None",
              _type: "FortPlaylistInfo",
            },
            {
              image: ``,
              playlist_name: "Playlist_DefaultSquad",
              hidden: false,
              special_border: "None",
              _type: "FortPlaylistInfo",
            },
          ],
        },
        _noIndex: false,
        _activeDate: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        _locale: "en-US",
      },
      playlistimages: {
        playlistimages: {
          images: [
            {
              image: ``,
              _type: "PlaylistImageEntry",
              playlistname: "Playlist_DefaultSolo",
            },
            {
              image:
                "",
              playlistname: "Playlist_PlaygroundV2",
              _type: "PlaylistImageEntry",
            },
            {
              image: ``,
              _type: "PlaylistImageEntry",
              playlistname: "Playlist_DefaultDuo",
            },
            {
              image: ``,
              _type: "PlaylistImageEntry",
              playlistname: "Playlist_DefaultSquad",
            },
          ],
          _type: "PlaylistImageList",
        },
        _title: "playlistimages",
        _activeDate: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        _locale: "en-US",
      },
      emergencynotice: {
        news: {
          _type: "Battle Royale News",
          messages: [
            {
              hidden: false,
              _type: "CommonUI Simple Message Base",
              title: "Lyric",
              body: "Welcome to Lyric! Expect bugs and glitches as we are still in early development",
              spotlight: true,
            },
          ],
        },
        _title: "emergencynotice",
        _noIndex: false,
        alwaysShow: false,
        _activeDate: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        _locale: "en-US",
      },
      emergencynoticev2: {
        "jcr:isCheckedOut": true,
        _title: "emergencynoticev2",
        _noIndex: false,
        emergencynotices: {
          _type: "Emergency Notices",
          emergencynotices: [
            {
              gamemodes: [],
              hidden: false,
              _type: "CommonUI Emergency Notice Base",
              title: "Lyric",
              body: "Welcome to Lyric! Expect bugs and glitches as we are still in early development",
            },
          ],
        },
        _activeDate: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        _locale: "en-US",
      },
      lobby: {
        stage: `season${ver.build}`,
        _title: "lobby",
        _activeDate: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        _locale: "en-US",
      },
      // fucked system
      dynamicbackgrounds:
        ver.build === 28
          ? {
              backgrounds: {
                backgrounds: [
                  {
                    stage: `defaultnotris`,
                    _type: "DynamicBackground",
                    backgroundimage:
                      "https://cdn2.unrealengine.com/t-bp23-lobby-2048x1024-2048x1024-26f2c1b27f63.png",
                    key: "lobby",
                  },
                ],
                _type: "DynamicBackgroundList",
              },
              _title: "dynamicbackgrounds",
              _noIndex: false,
              _activeDate: "2019-08-21T15:59:59.342Z",
              lastModified: "2019-10-29T13:07:27.936Z",
              _locale: "en-US",
              _templateName: "FortniteGameDynamicBackgrounds",
            }
          : ver.build === 24
          ? {
              backgrounds: {
                backgrounds: [
                  {
                    stage: `defaultnotris`,
                    _type: "DynamicBackground",
                    backgroundimage:
                      "https://cdn2.unrealengine.com/t-bp23-lobby-2048x1024-2048x1024-26f2c1b27f63.png",
                    key: "lobby",
                  },
                ],
                _type: "DynamicBackgroundList",
              },
              _title: "dynamicbackgrounds",
              _noIndex: false,
              _activeDate: new Date().toISOString(),
              lastModified: new Date().toISOString(),
              _locale: "en-US",
              _templateName: "FortniteGameDynamicBackgrounds",
            }
          : ver.build === 20
          ? {
              backgrounds: {
                backgrounds: [
                  {
                    stage: `season20`,
                    _type: "DynamicBackground",
                    backgroundimage:
                      "https://cdn2.unrealengine.com/t-bp20-40-armadillo-glowup-lobby-2048x2048-2048x2048-3b83b887cc7f.jpg",
                    key: "lobby",
                  },
                ],
                _type: "DynamicBackgroundList",
              },
              _title: "dynamicbackgrounds",
              _noIndex: false,
              _activeDate: new Date().toISOString(),
              lastModified: new Date().toISOString(),
              _locale: "en-US",
              _templateName: "FortniteGameDynamicBackgrounds",
            }
          : ver.build === 23
          ? {
              backgrounds: {
                backgrounds: [
                  {
                    stage: `season2300`,
                    _type: "DynamicBackground",
                    backgroundimage:
                      "https://cdn2.unrealengine.com/t-bp23-lobby-2048x1024-2048x1024-26f2c1b27f63.png",
                    key: "lobby",
                  },
                ],
                _type: "DynamicBackgroundList",
              },
              _title: "dynamicbackgrounds",
              _noIndex: false,
              _activeDate: "2019-08-21T15:59:59.342Z",
              lastModified: "2019-10-29T13:07:27.936Z",
              _locale: "en-US",
              _templateName: "FortniteGameDynamicBackgrounds",
            }
          : {
              backgrounds: {
                backgrounds: [
                  {
                    stage: `season${ver.build}`,
                    _type: "DynamicBackground",
                    key: "lobby",
                  },
                ],
                _type: "DynamicBackgroundList",
              },
              _title: "dynamicbackgrounds",
              _noIndex: false,
              _activeDate: new Date().toISOString(),
              lastModified: new Date().toISOString(),
              _locale: "en-US",
              _templateName: "FortniteGameDynamicBackgrounds",
            },

      ...section,
      _suggestedPrefetch: [],
    };

    return c.json(content);
  });
}
