import { describe, expect, test } from "vitest";
import {
  ganttToData,
  journeyToData,
  pieToData,
  timelineToData,
  type RawGantt,
} from "../mermaid-import-data";

describe("数据/时间家族解析 → DataDiagram", () => {
  test("pie：sections → label/value 行", () => {
    expect(pieToData({ title: "宠物", sections: { 狗: 10, 猫: 5 } })).toEqual({
      title: "宠物",
      config: {},
      rows: [
        { label: "狗", value: "10" },
        { label: "猫", value: "5" },
      ],
    });
  });

  test("gantt：title + dateFormat 配置 + 任务行（从 raw 取 start/duration）", () => {
    const raw: RawGantt = {
      title: "计划",
      dateFormat: "YYYY-MM-DD",
      tasks: [
        { section: "设计", task: "原型 ", raw: { startTime: { startData: "2024-01-01" }, endTime: { data: "3d" } } },
      ],
    };
    expect(ganttToData(raw)).toEqual({
      title: "计划",
      config: { dateFormat: "YYYY-MM-DD" },
      rows: [{ section: "设计", task: "原型", start: "2024-01-01", duration: "3d" }],
    });
  });

  test("timeline：task=时间点，events 合并为事件", () => {
    expect(timelineToData({ title: "历史", tasks: [{ task: "2004 ", events: ["Facebook", "Flickr"] }] })).toEqual({
      title: "历史",
      config: {},
      rows: [{ period: "2004", event: "Facebook / Flickr" }],
    });
  });

  test("journey：section/task/score/people", () => {
    expect(
      journeyToData({ title: "上班", tasks: [{ section: "早晨", task: "起床", score: 3, people: ["我", "同事"] }] }),
    ).toEqual({
      title: "上班",
      config: {},
      rows: [{ section: "早晨", task: "起床", score: "3", actors: "我, 同事" }],
    });
  });
});
