import CoreGraphics

/// Scroll distance for the donor form inside its fixed card.
/// Positive values move the form upward. The card clips the result, so content cannot leave the border.
struct DonorKeyboardAvoidance: Sendable {
    /// `fieldInContent` is the focused field before scrolling, with its origin at the top of the form.
    /// `viewport` and `keyboard` are in the same screen coordinate space.
    /// The viewport's top is where the form's top sits when the scroll offset is zero.
    static func scrollOffset(
        fieldInContent: CGRect,
        viewport: CGRect,
        keyboard: CGRect,
        padding: CGFloat,
        reservedAboveField: CGFloat = 0
    ) -> CGFloat {
        let withRoom = offset(
            fieldInContent: fieldInContent,
            viewport: viewport,
            keyboard: keyboard,
            padding: padding,
            reservedAboveField: reservedAboveField
        )
        if reservedAboveField > 0, !fits(
            fieldInContent: fieldInContent,
            viewport: viewport,
            keyboard: keyboard,
            padding: padding,
            reservedAboveField: reservedAboveField,
            scroll: withRoom
        ) {
            return offset(
                fieldInContent: fieldInContent,
                viewport: viewport,
                keyboard: keyboard,
                padding: padding,
                reservedAboveField: 0
            )
        }
        return withRoom
    }

    /// Downward scroll used when iPadOS reports only the floating pad's accessory bar.
    /// The pad itself is a remote view and has no local rectangle. `coveredTop` is how far
    /// that pad reaches into the field viewport. The result stays inside the card.
    static func floatingPadClearance(
        fieldInContent: CGRect,
        viewport: CGRect,
        keyboard: CGRect,
        contentBottom: CGFloat,
        coveredTop: CGFloat
    ) -> CGFloat {
        guard fieldInContent.height > 1, viewport.height > 1 else { return 0 }
        guard contentBottom > 1, coveredTop > 1 else { return 0 }
        guard keyboard.width > viewport.width * 0.8 else { return 0 }
        guard keyboard.height > 1, keyboard.height < 90 else { return 0 }
        guard keyboard.minY > viewport.midY else { return 0 }
        guard fieldInContent.minY < coveredTop else { return 0 }
        let room = max(0, viewport.height - contentBottom - 8)
        guard room > 1 else { return 0 }
        return -min(room, coveredTop)
    }

    private static func offset(
        fieldInContent: CGRect,
        viewport: CGRect,
        keyboard: CGRect,
        padding: CGFloat,
        reservedAboveField: CGFloat
    ) -> CGFloat {
        guard fieldInContent.width > 1, fieldInContent.height > 1 else { return 0 }
        guard viewport.width > 1, viewport.height > 1 else { return 0 }
        guard keyboard.width > 1, keyboard.height > 1 else { return 0 }

        let fieldMinX = viewport.minX + fieldInContent.minX
        let fieldMaxX = fieldMinX + fieldInContent.width
        let overlapsX = fieldMaxX > keyboard.minX + 1 && fieldMinX < keyboard.maxX - 1
        guard overlapsX else { return 0 }

        let gaps = freeGaps(viewport: viewport, keyboard: keyboard, padding: padding)
        guard !gaps.isEmpty else { return 0 }

        let blockTop = fieldInContent.minY - reservedAboveField
        let blockBottom = fieldInContent.maxY
        var best: CGFloat?

        for gap in gaps where gap.height > 1 {
            let lower = viewport.minY + blockBottom - gap.maxY
            let upper = viewport.minY + blockTop - gap.minY
            guard lower <= upper + 0.5 else { continue }
            let candidate: CGFloat
            if lower <= 0, upper >= 0 {
                candidate = 0
            } else if lower > 0 {
                candidate = lower
            } else {
                candidate = upper
            }
            if best == nil || abs(candidate) < abs(best ?? 0) {
                best = candidate
            }
        }
        return best ?? 0
    }

    private static func fits(
        fieldInContent: CGRect,
        viewport: CGRect,
        keyboard: CGRect,
        padding: CGFloat,
        reservedAboveField: CGFloat,
        scroll: CGFloat
    ) -> Bool {
        let gaps = freeGaps(viewport: viewport, keyboard: keyboard, padding: padding)
        let top = viewport.minY + fieldInContent.minY - reservedAboveField - scroll
        let bottom = viewport.minY + fieldInContent.maxY - scroll
        return gaps.contains { gap in
            top >= gap.minY - 0.5 && bottom <= gap.maxY + 0.5
        }
    }

    /// Vertical spans inside the viewport that the keyboard does not cover.
    /// A docked keyboard leaves the span above it. A floating keypad leaves the spans above and below it.
    private static func freeGaps(viewport: CGRect, keyboard: CGRect, padding: CGFloat) -> [CGRect] {
        let coverTop = max(keyboard.minY, viewport.minY)
        let coverBottom = min(keyboard.maxY, viewport.maxY)
        guard coverBottom > coverTop else {
            return [viewport]
        }

        var gaps: [CGRect] = []
        let aboveBottom = coverTop - padding
        if aboveBottom - viewport.minY > 1 {
            gaps.append(CGRect(x: viewport.minX, y: viewport.minY, width: viewport.width, height: aboveBottom - viewport.minY))
        }
        let belowTop = coverBottom + padding
        if viewport.maxY - belowTop > 1 {
            gaps.append(CGRect(x: viewport.minX, y: belowTop, width: viewport.width, height: viewport.maxY - belowTop))
        }
        return gaps
    }
}

/// Where the address suggestion list sits inside the donor-card viewport.
/// The list stays off the address box and inside the viewport. It moves above the box
/// when the gap under the box, down to the keyboard, cannot hold the rows.
struct AddressSuggestionPlacement: Equatable, Sendable {
    var showsAbove: Bool
    var frame: CGRect

    static func place(
        field: CGRect,
        viewportSize: CGSize,
        keyboardTop: CGFloat?,
        desiredHeight: CGFloat,
        gap: CGFloat,
        minimumHeight: CGFloat
    ) -> AddressSuggestionPlacement? {
        guard field.width > 1, field.height > 1 else { return nil }
        guard viewportSize.width > 1, viewportSize.height > 1 else { return nil }
        guard desiredHeight > 1, minimumHeight > 1, gap >= 0 else { return nil }

        let visibleBottom = min(viewportSize.height, max(0, keyboardTop ?? viewportSize.height))
        let aboveRoom = field.minY - gap
        let belowRoom = visibleBottom - field.maxY - gap
        let placeAbove = belowRoom + 0.5 < desiredHeight && aboveRoom > belowRoom
        let room = placeAbove ? aboveRoom : belowRoom
        let height = min(desiredHeight, room)
        guard height + 0.5 >= minimumHeight else { return nil }

        let y = placeAbove ? (field.minY - gap - height) : (field.maxY + gap)
        guard y >= -0.5, y + height <= viewportSize.height + 0.5 else { return nil }

        let list = CGRect(x: field.minX, y: y, width: field.width, height: height)
        guard !list.intersects(field) else { return nil }
        return AddressSuggestionPlacement(showsAbove: placeAbove, frame: list)
    }
}
