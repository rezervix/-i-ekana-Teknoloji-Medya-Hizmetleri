"use client";

import { useEffect, useState } from "react";

const CITY_NAMES: Record<string, string> = {
  mardin: "Mardin",
  kirsehir: "Kırşehir",
  batman: "Batman",
  siirt: "Siirt",
  sirnak: "Şırnak",
  nevsehir: "Nevşehir",
  aksaray: "Aksaray",
  nigde: "Niğde",
  corum: "Çorum",
  isparta: "Isparta",
  karaman: "Karaman",
  yozgat: "Yozgat",
};

const DEFAULT_HEADING = "Sosyal Medya & Reklam Danışmanlığı";

export default function CityHeroHeading() {
  const [heading, setHeading] = useState(DEFAULT_HEADING);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const campaignContent = (params.get("utm_content") || "").trim().toLowerCase();

      if (!campaignContent || campaignContent === "genel-yerel") {
        setHeading(DEFAULT_HEADING);
        return;
      }

      const city = CITY_NAMES[campaignContent];
      setHeading(
        city
          ? `${city} İşletmeleri İçin Kurumsal Sosyal Medya ve Reklam Danışmanlığı`
          : DEFAULT_HEADING
      );
    } catch {
      setHeading(DEFAULT_HEADING);
    }
  }, []);

  return (
    <h1 className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-[44px] xl:text-[50px] text-corp-charcoal font-bold tracking-tight leading-[1.15]">
      {heading}
    </h1>
  );
}
