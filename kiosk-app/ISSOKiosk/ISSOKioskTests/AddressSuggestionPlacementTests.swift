import XCTest
@testable import ISSOKiosk

final class AddressSuggestionPlacementTests: XCTestCase {
    private let field = CGRect(x: 16, y: 420, width: 360, height: 52)
    private let viewport = CGSize(width: 420, height: 640)

    func testListMovesAboveWhenKeyboardLeavesNoRoomBelow() throws {
        let placed = AddressSuggestionPlacement.place(
            field: field,
            viewportSize: viewport,
            keyboardTop: field.maxY + 8,
            desiredHeight: 200,
            gap: 4,
            minimumHeight: 36
        )

        let list = try XCTUnwrap(placed)
        XCTAssertTrue(list.showsAbove)
        XCTAssertFalse(list.frame.intersects(field))
        XCTAssertLessThanOrEqual(list.frame.maxY, field.minY - 4)
        XCTAssertGreaterThanOrEqual(list.frame.minY, 0)
        XCTAssertLessThanOrEqual(list.frame.maxY, viewport.height)
        XCTAssertEqual(list.frame.width, field.width, accuracy: 0.1)
        XCTAssertEqual(list.frame.height, 200, accuracy: 0.1)
    }

    func testListStaysBelowWhenTheGapCanHoldIt() throws {
        let placed = AddressSuggestionPlacement.place(
            field: CGRect(x: 16, y: 80, width: 360, height: 52),
            viewportSize: viewport,
            keyboardTop: nil,
            desiredHeight: 160,
            gap: 4,
            minimumHeight: 36
        )

        let list = try XCTUnwrap(placed)
        XCTAssertFalse(list.showsAbove)
        XCTAssertGreaterThanOrEqual(list.frame.minY, 80 + 52 + 4)
        XCTAssertEqual(list.frame.height, 160, accuracy: 0.1)
        XCTAssertFalse(list.frame.intersects(CGRect(x: 16, y: 80, width: 360, height: 52)))
    }

    func testShortGapUsesABoundedHeight() throws {
        let placed = AddressSuggestionPlacement.place(
            field: CGRect(x: 10, y: 140, width: 300, height: 48),
            viewportSize: CGSize(width: 400, height: 300),
            keyboardTop: 200,
            desiredHeight: 220,
            gap: 4,
            minimumHeight: 36
        )

        let list = try XCTUnwrap(placed)
        XCTAssertTrue(list.showsAbove)
        XCTAssertEqual(list.frame.height, 140 - 4, accuracy: 0.1)
        XCTAssertLessThan(list.frame.height, 220)
    }

    func testNoRoomOnEitherSideDrawsNothing() {
        let placed = AddressSuggestionPlacement.place(
            field: CGRect(x: 10, y: 4, width: 300, height: 48),
            viewportSize: CGSize(width: 400, height: 80),
            keyboardTop: 56,
            desiredHeight: 200,
            gap: 4,
            minimumHeight: 36
        )
        XCTAssertNil(placed)
    }
}
