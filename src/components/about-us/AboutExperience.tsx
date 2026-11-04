"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { SiteShell } from "@/components/site/SiteShell";
import { aboutMembers, type AboutMember } from "@/content/about-us";
import { aboutArtworkFrames } from "@/content/about-us-art";
import { AboutArt } from "./AboutArt";

// Align the visible circles, rather than the differently padded source canvases.
function artworkStyle(
  member: AboutMember,
  kind: "portrait" | "avatar",
): CSSProperties {
  const {
    canvas: [width, height],
    bounds: [left, top, right, bottom],
  } = aboutArtworkFrames[member.id][kind];
  const scale =
    (kind === "portrait" ? 528 : 334) / Math.max(right - left, bottom - top);
  const x = (((width / 2 - (left + right) / 2) * scale) / width) * 100;
  const y = (((height / 2 - (top + bottom) / 2) * scale) / height) * 100;
  return { transform: `translate(${x}%, ${y}%) scale(${scale})` };
}

function MemberButton({
  member,
  selected,
  onSelect,
}: {
  member: AboutMember;
  selected: AboutMember | null;
  onSelect: (member: AboutMember) => void;
}) {
  return (
    <button
      className={`about-avatar about-avatar--${member.id}`}
      type="button"
      onClick={() => onSelect(member)}
      aria-label={`Meet ${member.name}`}
      aria-expanded={selected?.id === member.id}
      aria-controls="about-member-region"
    >
      <Image
        src={`/about-us/avatar-${member.id}.webp`}
        width={176}
        height={176}
        alt=""
        style={artworkStyle(member, "avatar")}
      />
    </button>
  );
}

export function AboutExperience({ introduction }: { introduction: ReactNode }) {
  const [selected, setSelected] = useState<AboutMember | null>(null);
  const profile = useRef<HTMLElement>(null);
  const opened = useRef(false);
  const scrollToProfile = useRef(false);
  const requestVersion = useRef(0);
  const assetRequests = useRef(new Map<string, Promise<void>>());

  const prepareMember = useCallback((member: AboutMember) => {
    const cached = assetRequests.current.get(member.id);
    if (cached) return cached;
    let decorations = assetRequests.current.get("decorations");
    if (!decorations) {
      decorations = Promise.all(
        Array.from({ length: 10 }, (_, part) => {
          const image = new window.Image();
          image.src = `/about-us/microphone-mask-${part}.svg`;
          return image.decode().catch(() => undefined);
        }),
      ).then(() => undefined);
      assetRequests.current.set("decorations", decorations);
    }
    const ready = Promise.all([
      decorations,
      ...["portrait", "gradient"].map((kind) => {
        const image = new window.Image();
        image.src = `/about-us/${kind}-${member.id}.webp`;
        return image.decode().catch(() => undefined);
      }),
    ]).then(() => undefined);
    assetRequests.current.set(member.id, ready);
    return ready;
  }, []);

  useEffect(() => {
    // Decode the supplied local artwork before a later switch can expose it.
    aboutMembers.forEach((member) => {
      void prepareMember(member);
    });
    return () => {
      requestVersion.current += 1;
    };
  }, [prepareMember]);

  async function selectMember(member: AboutMember) {
    const version = ++requestVersion.current;
    if (selected?.id === member.id) return;
    await prepareMember(member);
    if (version !== requestVersion.current) return;
    scrollToProfile.current = !opened.current;
    opened.current = true;
    setSelected(member);
  }

  useLayoutEffect(() => {
    if (!scrollToProfile.current) return;
    scrollToProfile.current = false;
    profile.current?.scrollIntoView({
      behavior: window.matchMedia(
        "(min-width: 1200px) and (prefers-reduced-motion: no-preference)",
      ).matches
        ? "smooth"
        : "auto",
      block: "start",
    });
  }, [selected]);

  const theme = {
    "--about-footer": selected?.footerColor ?? "#fbe7a1",
    "--about-member-name": selected?.nameColor,
    "--about-member-copy": selected?.copyColor,
    "--about-member-script": selected?.scriptColor,
    "--about-microphone-head": selected?.microphoneHead,
    "--about-microphone-handle": selected?.microphoneHandle,
    "--about-microphone-detail": selected?.microphoneDetail,
    "--about-member-name-size": selected ? `${selected.nameSize}px` : undefined,
  } as CSSProperties;

  return (
    <div
      className={`about-experience${selected ? " about-experience--selected" : ""}`}
      style={theme}
    >
      <SiteShell page="about-us">
        <main tabIndex={-1} id="main-content" className="about-main">
          {introduction}
          <section
            className="about-team"
            aria-labelledby={selected ? undefined : "about-team-title"}
            aria-label={selected ? "Team member choices" : undefined}
          >
            <div
              className="about-team__decorations"
              aria-hidden="true"
              hidden={Boolean(selected)}
            >
              <AboutArt name="team-music-left" width={128} height={616} />
              <AboutArt name="team-music-right" width={192} height={504} />
            </div>
            <div className="about-team__inner">
              <div
                className="about-team__avatars"
                role="group"
                aria-label="Team members"
              >
                {aboutMembers.map((member) => (
                  <MemberButton
                    key={member.id}
                    member={member}
                    selected={selected}
                    onSelect={selectMember}
                  />
                ))}
              </div>
              {!selected && (
                <div className="about-team__heading">
                  <p>THE HUMANS</p>
                  <h2 id="about-team-title">MEET THE TEAM</h2>
                </div>
              )}
            </div>
          </section>
          <div id="about-member-region">
            {selected && (
              <section
                ref={profile}
                className="about-member"
                aria-labelledby="about-member-name"
                data-member={selected.id}
              >
                <div className="about-member__backgrounds" aria-hidden="true">
                  {aboutMembers.map((member) => (
                    <div
                      key={member.id}
                      className={`about-member__gradient${selected.id === member.id ? " is-selected" : ""}`}
                      style={{
                        backgroundImage: `url("/about-us/gradient-${member.id}.webp")`,
                      }}
                    />
                  ))}
                </div>
                <AboutArt name="profile-stars-left" width={308} height={88} />
                <AboutArt name="profile-stars-right" width={300} height={76} />
                <div className="about-member__inner">
                  <div className="about-member__portrait-slot">
                    {aboutMembers.map((member) => (
                      <Image
                        key={member.id}
                        className={`about-member__portrait${selected.id === member.id ? " is-selected" : ""}`}
                        src={`/about-us/portrait-${member.id}.webp`}
                        width={384}
                        height={352}
                        style={artworkStyle(member, "portrait")}
                        loading="eager"
                        alt={
                          selected.id === member.id
                            ? `Illustrated portrait of ${member.name}`
                            : ""
                        }
                        aria-hidden={selected.id !== member.id}
                      />
                    ))}
                  </div>
                  <div
                    className="about-member__copy"
                    aria-live="polite"
                    aria-atomic="true"
                  >
                    <p
                      className={`about-member__nickname${selected.id === "mai" ? " about-member__nickname--captain" : ""}`}
                    >
                      {selected.nickname}
                    </p>
                    <h2 id="about-member-name">{selected.name}</h2>
                    <p className="about-member__role">{selected.role}</p>
                    <p className="about-member__bio">{selected.bio}</p>
                  </div>
                </div>
                <div
                  className="about-member__microphone is-selected"
                  aria-hidden="true"
                >
                  {(
                    [
                      "cream",
                      "head",
                      "handle",
                      "detail",
                      "cream",
                      "cream",
                      "cream",
                      "detail",
                      "detail",
                      "head",
                    ] as const
                  ).map((part, index) => (
                    <span
                      key={index}
                      className={`about-member__microphone-layer about-member__microphone-layer--${part}`}
                      style={
                        {
                          "--microphone-mask": `url("/about-us/microphone-mask-${index}.svg")`,
                        } as CSSProperties
                      }
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        </main>
      </SiteShell>
    </div>
  );
}
