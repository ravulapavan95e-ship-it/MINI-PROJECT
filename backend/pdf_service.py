from datetime import datetime, timezone
from io import BytesIO
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


def create_roadmap_pdf(learner: dict, roadmap: dict, topics: list[dict]) -> BytesIO:
    output = BytesIO()
    document = SimpleDocTemplate(
        output,
        pagesize=letter,
        rightMargin=0.7 * inch,
        leftMargin=0.7 * inch,
        topMargin=0.65 * inch,
        bottomMargin=0.65 * inch,
        title="Personalized Learning Assistant Roadmap",
        author="Personalized Learning Assistant",
    )
    styles = getSampleStyleSheet()
    styles.add(
        ParagraphStyle(
            name="RoadmapTitle",
            parent=styles["Title"],
            textColor=colors.HexColor("#243b72"),
            alignment=TA_LEFT,
            spaceAfter=12,
        )
    )
    styles.add(
        ParagraphStyle(
            name="TopicHeading",
            parent=styles["Heading2"],
            textColor=colors.HexColor("#3d4f8f"),
            spaceBefore=12,
            spaceAfter=5,
        )
    )
    body = styles["BodyText"]
    story = [
        Paragraph("Personalized Learning Assistant", styles["RoadmapTitle"]),
        Paragraph(escape(roadmap["title"]), styles["Heading1"]),
        Paragraph(escape(roadmap["description"]), body),
        Spacer(1, 12),
    ]
    learner_rows = [
        ["Learner", escape(learner["name"])],
        ["Learning goal", escape(learner["learning_goal"])],
        ["Skill level", escape(learner["skill_level"].title())],
        ["Available study time", f'{learner["study_time"]} minutes per day'],
    ]
    learner_table = Table(learner_rows, colWidths=[1.65 * inch, 5.0 * inch])
    learner_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#eef2ff")),
                ("TEXTCOLOR", (0, 0), (0, -1), colors.HexColor("#243b72")),
                ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
                ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#d8deed")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 7),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ]
        )
    )
    story.extend([learner_table, Spacer(1, 14)])

    completed = sum(bool(topic["completed"]) for topic in topics)
    progress = round(completed / len(topics) * 100) if topics else 0
    created_at = datetime.strptime(
        roadmap["created_at"],
        "%Y-%m-%d %H:%M:%S",
    ).replace(tzinfo=timezone.utc)
    story.append(
        Paragraph(
            f"Progress: {completed} of {len(topics)} topics completed ({progress}%)"
            f" &nbsp; | &nbsp; Generated: {created_at.astimezone():%B %d, %Y}",
            body,
        )
    )
    story.append(Spacer(1, 8))
    story.append(Paragraph("Learning Roadmap", styles["Heading1"]))

    for topic in topics:
        status = "Completed" if topic["completed"] else "Not completed"
        story.append(
            Paragraph(
                f'{topic["order_index"]}. {escape(topic["title"])}'
                f' &nbsp; <font color="#64748b">({status})</font>',
                styles["TopicHeading"],
            )
        )
        story.append(Paragraph(escape(topic["description"]), body))
        story.append(
            Paragraph(
                f'<b>Estimated time:</b> {topic["estimated_minutes"]} minutes',
                body,
            )
        )
        story.append(
            Paragraph(
                f'<b>Recommended practice:</b> {escape(topic["practice_question"])}',
                body,
            )
        )

    document.build(story)
    output.seek(0)
    return output
