import XCTest
@testable import ISSOKiosk

@MainActor
final class DonorCheckoutRulesTests: XCTestCase {
    func testPhonePasteAndDigitLimit() {
        XCTAssertEqual(DonorCheckoutRules.digits(from: "(215) 520-0565"), "2155200565")
        XCTAssertEqual(DonorCheckoutRules.digits(from: "215.520.0565"), "2155200565")
        XCTAssertEqual(DonorCheckoutRules.digits(from: "2155200565123"), "2155200565")
        XCTAssertEqual(DonorCheckoutRules.digits(from: "215520056"), "215520056")
    }

    func testPhoneDisplay() {
        XCTAssertEqual(DonorCheckoutRules.displayPhone("2155200565"), "(215) 520-0565")
        XCTAssertEqual(DonorCheckoutRules.displayPhone("215"), "(215")
        XCTAssertEqual(DonorCheckoutRules.displayPhone("215520"), "(215) 520")
    }

    func testPhoneKeypadKeepsEachDigit() {
        var stored = ""
        for digit in "2155200565" {
            stored = DonorCheckoutRules.phoneDigitsByInserting(digit, into: stored)
        }
        XCTAssertEqual(stored, "2155200565")
        XCTAssertEqual(DonorCheckoutRules.displayPhone(stored), "(215) 520-0565")
        XCTAssertEqual(DonorCheckoutRules.phoneDigitsByInserting("9", into: stored), "2155200565")
        stored = DonorCheckoutRules.phoneDigitsByDeletingLast(from: stored)
        XCTAssertEqual(stored, "215520056")
        XCTAssertEqual(DonorCheckoutRules.phoneDigitsByInserting("a", into: stored), "215520056")
        XCTAssertEqual(DonorCheckoutRules.phoneDigitsByDeletingLast(from: ""), "")
    }

    func testUnicodeNamesArePreserved() {
        let gujarati = "મિત"
        let hindi = "मीत"
        let submission = DonorCheckoutRules.submission(
            draft: .init(firstName: "  \(gujarati)  ", lastName: hindi, phoneDigits: "2155200565", email: "", address: ""),
            anonymous: false
        )
        XCTAssertEqual(submission.name, "\(gujarati) \(hindi)")
        XCTAssertEqual(DonorCheckoutRules.splitFullName("એક હરિ ભગત").first, "એક હરિ")
        XCTAssertEqual(DonorCheckoutRules.splitFullName("એક હરિ ભગત").last, "ભગત")
    }

    func testIdentifiedFieldRequirements() {
        let empty = DonorCheckoutRules.Draft()
        XCTAssertEqual(
            DonorCheckoutRules.issues(draft: empty, anonymous: false),
            [.firstNameRequired, .lastNameRequired, .phoneRequired]
        )
        var nine = empty
        nine.firstName = "A"
        nine.lastName = "B"
        nine.phoneDigits = "215520056"
        XCTAssertEqual(DonorCheckoutRules.issues(draft: nine, anonymous: false), [.phoneRequired])
        nine.phoneDigits = "2155200565"
        XCTAssertTrue(DonorCheckoutRules.issues(draft: nine, anonymous: false).isEmpty)
    }

    func testAnonymousSkipsPersonalRequirements() {
        let issues = DonorCheckoutRules.issues(draft: .init(), anonymous: true)
        XCTAssertTrue(issues.isEmpty)
        let submission = DonorCheckoutRules.submission(draft: .init(firstName: "Hidden", phoneDigits: "2155200565"), anonymous: true)
        XCTAssertNil(submission.name)
        XCTAssertNil(submission.phone)
        XCTAssertNil(submission.email)
        XCTAssertNil(submission.address)
        XCTAssertTrue(submission.anonymous)
    }

    func testEmailValidation() {
        XCTAssertTrue(DonorCheckoutRules.isValidEmail(""))
        XCTAssertTrue(DonorCheckoutRules.isValidEmail(" donor+seva@temple.org "))
        XCTAssertFalse(DonorCheckoutRules.isValidEmail("not-an-email"))
        XCTAssertFalse(DonorCheckoutRules.isValidEmail("a@b"))
        var draft = DonorCheckoutRules.Draft(firstName: "A", lastName: "B", phoneDigits: "2155200565", email: "bad", address: "")
        XCTAssertEqual(DonorCheckoutRules.issues(draft: draft, anonymous: false), [.emailInvalid])
        draft.email = ""
        XCTAssertTrue(DonorCheckoutRules.issues(draft: draft, anonymous: false).isEmpty)
    }

    func testSavedDonorDoesNotOverwriteManualEntry() {
        let saved = DonorCheckoutRules.SavedDonor(name: "Saved Person", email: "saved@temple.org", address: "1 Temple Rd")
        let manual = DonorCheckoutRules.Draft(firstName: "Manual", lastName: "Donor", phoneDigits: "2155200565", email: "", address: "Typed")
        let filled = DonorCheckoutRules.applySavedDonor(saved, to: manual)
        XCTAssertEqual(filled.firstName, "Manual")
        XCTAssertEqual(filled.lastName, "Donor")
        XCTAssertEqual(filled.email, "saved@temple.org")
        XCTAssertEqual(filled.address, "Typed")
    }

    func testSavedDonorFillsOnlyEmptyName() {
        let saved = DonorCheckoutRules.SavedDonor(name: "Ek Hari Bhagat", email: "a@b.co", address: "2101 Garry Rd")
        let filled = DonorCheckoutRules.applySavedDonor(saved, to: .init(phoneDigits: "2155200565"))
        XCTAssertEqual(filled.firstName, "Ek Hari")
        XCTAssertEqual(filled.lastName, "Bhagat")
        XCTAssertEqual(filled.email, "a@b.co")
        XCTAssertEqual(filled.address, "2101 Garry Rd")
    }

    func testLookupDoesNotStartUntilTenDigitsOrWhileAnonymous() {
        var session = DonorLookupSession()
        XCTAssertEqual(session.notePhone("215520056", anonymous: false), .ignore)
        XCTAssertEqual(session.notePhone("2155200565", anonymous: true), .ignore)
        XCTAssertEqual(session.notePhone("(215) 520-0565", anonymous: false), .start(phone: "2155200565", generation: 0))
        XCTAssertEqual(session.notePhone("2155200565", anonymous: false), .ignore)
    }

    func testStaleLookupAndAnonymousInvalidateResponse() {
        var session = DonorLookupSession()
        _ = session.notePhone("2155200565", anonymous: false)
        session.anonymous = true
        XCTAssertEqual(session.receive(phone: "2155200565", generation: 0, found: true), .stale)
        session.anonymous = false
        session.inFlightPhone = "2155200565"
        session.phoneDigits = "2155200999"
        XCTAssertEqual(session.receive(phone: "2155200565", generation: 0, found: true), .stale)
        session.invalidate()
        session.phoneDigits = "2155200565"
        session.inFlightPhone = "2155200565"
        XCTAssertEqual(session.receive(phone: "2155200565", generation: 0, found: true), .stale)
    }

    func testSuccessfulLookupPromptsWithoutApplying() {
        var session = DonorLookupSession()
        _ = session.notePhone("2155200565", anonymous: false)
        XCTAssertEqual(session.receive(phone: "2155200565", generation: 0, found: true), .prompt)
        XCTAssertEqual(session.receive(phone: "2155200565", generation: 0, found: false), .stale)
    }

    func testAnonymousToggleRestoresSnapshot() {
        let entered = DonorCheckoutRules.Draft(firstName: "Meera", lastName: "Shah", phoneDigits: "2155200565", email: "m@t.org", address: "12 Road")
        let change = DonorCheckoutRules.turningAnonymousOn(entered)
        XCTAssertEqual(change.visible, .init())
        XCTAssertEqual(change.snapshot, entered)
        XCTAssertEqual(DonorCheckoutRules.turningAnonymousOff(snapshot: change.snapshot), entered)
        XCTAssertEqual(DonorCheckoutRules.turningAnonymousOff(snapshot: nil), .init())
    }

    func testDonorFieldFocusOrder() {
        XCTAssertEqual(DonorInlineFocus.phone.nextField, .firstName)
        XCTAssertNil(DonorInlineFocus.phone.previousField)
        XCTAssertEqual(DonorInlineFocus.firstName.previousField, .phone)
        XCTAssertEqual(DonorInlineFocus.firstName.nextField, .lastName)
        XCTAssertEqual(DonorInlineFocus.lastName.previousField, .firstName)
        XCTAssertEqual(DonorInlineFocus.lastName.nextField, .email)
        XCTAssertEqual(DonorInlineFocus.email.previousField, .lastName)
        XCTAssertEqual(DonorInlineFocus.email.nextField, .address)
        XCTAssertEqual(DonorInlineFocus.address.previousField, .email)
        XCTAssertNil(DonorInlineFocus.address.nextField)
        XCTAssertNil(DonorInlineFocus.none.nextField)
        XCTAssertNil(DonorInlineFocus.none.previousField)
    }

    func testScrollKeepsFieldAboveDockedKeyboardInsideTheCard() {
        let viewport = CGRect(x: 40, y: 160, width: 520, height: 640)
        let field = CGRect(x: 20, y: 520, width: 460, height: 72)
        let keyboard = CGRect(x: 0, y: 700, width: 1366, height: 320)
        let scroll = DonorKeyboardAvoidance.scrollOffset(
            fieldInContent: field,
            viewport: viewport,
            keyboard: keyboard,
            padding: 16
        )
        let fieldBottom = viewport.minY + field.maxY - scroll
        XCTAssertLessThanOrEqual(fieldBottom, keyboard.minY - 16 + 0.5)
        XCTAssertGreaterThan(scroll, 0)
        let fieldTop = viewport.minY + field.minY - scroll
        XCTAssertGreaterThanOrEqual(fieldTop, viewport.minY - 0.5)
    }

    func testScrollIsZeroWhenFieldIsAlreadyClear() {
        let viewport = CGRect(x: 40, y: 160, width: 520, height: 640)
        let field = CGRect(x: 20, y: 80, width: 460, height: 72)
        let keyboard = CGRect(x: 0, y: 700, width: 1366, height: 320)
        XCTAssertEqual(
            DonorKeyboardAvoidance.scrollOffset(fieldInContent: field, viewport: viewport, keyboard: keyboard, padding: 16),
            0,
            accuracy: 0.01
        )
    }

    func testScrollIgnoresHiddenKeyboardAndAPadThatMissesTheField() {
        let viewport = CGRect(x: 40, y: 160, width: 520, height: 640)
        let field = CGRect(x: 20, y: 400, width: 460, height: 72)
        XCTAssertEqual(
            DonorKeyboardAvoidance.scrollOffset(fieldInContent: field, viewport: viewport, keyboard: .zero, padding: 16),
            0
        )
        XCTAssertEqual(
            DonorKeyboardAvoidance.scrollOffset(fieldInContent: .zero, viewport: viewport, keyboard: CGRect(x: 0, y: 400, width: 800, height: 300), padding: 16),
            0
        )
        let padOnTheRight = CGRect(x: 900, y: 180, width: 280, height: 360)
        XCTAssertEqual(
            DonorKeyboardAvoidance.scrollOffset(fieldInContent: field, viewport: viewport, keyboard: padOnTheRight, padding: 16),
            0
        )
    }

    func testFloatingPadScrollsOnlyTheCoveredField() {
        let viewport = CGRect(x: 40, y: 140, width: 520, height: 680)
        let covered = CGRect(x: 16, y: 30, width: 460, height: 70)
        let pad = CGRect(x: 48, y: 150, width: 280, height: 220)
        let scroll = DonorKeyboardAvoidance.scrollOffset(
            fieldInContent: covered,
            viewport: viewport,
            keyboard: pad,
            padding: 12
        )
        let fieldTop = viewport.minY + covered.minY - scroll
        let fieldBottom = viewport.minY + covered.maxY - scroll
        let clearOfPad = fieldBottom <= pad.minY - 12 + 0.5 || fieldTop >= pad.maxY + 12 - 0.5
        XCTAssertTrue(clearOfPad)
        XCTAssertGreaterThanOrEqual(fieldTop, viewport.minY - 0.5)
        XCTAssertLessThanOrEqual(fieldBottom, viewport.maxY + 0.5)
    }

    func testSuggestionsStayInTheGapWhenThereIsRoom() {
        let viewport = CGRect(x: 40, y: 160, width: 520, height: 700)
        let field = CGRect(x: 20, y: 560, width: 460, height: 70)
        let keyboard = CGRect(x: 0, y: 760, width: 1366, height: 280)
        let scroll = DonorKeyboardAvoidance.scrollOffset(
            fieldInContent: field,
            viewport: viewport,
            keyboard: keyboard,
            padding: 12,
            reservedAboveField: 110
        )
        let suggestionTop = viewport.minY + field.minY - 110 - scroll
        let fieldBottom = viewport.minY + field.maxY - scroll
        XCTAssertGreaterThanOrEqual(suggestionTop, viewport.minY - 0.5)
        XCTAssertLessThanOrEqual(fieldBottom, keyboard.minY - 12 + 0.5)
    }

    func testFieldStaysInsideTheCardWhenSuggestionsCannotFit() {
        let viewport = CGRect(x: 0, y: 100, width: 400, height: 220)
        let field = CGRect(x: 10, y: 140, width: 360, height: 60)
        let keyboard = CGRect(x: 0, y: 250, width: 800, height: 400)
        let scroll = DonorKeyboardAvoidance.scrollOffset(
            fieldInContent: field,
            viewport: viewport,
            keyboard: keyboard,
            padding: 8,
            reservedAboveField: 180
        )
        let fieldTop = viewport.minY + field.minY - scroll
        let fieldBottom = viewport.minY + field.maxY - scroll
        XCTAssertGreaterThanOrEqual(fieldTop, viewport.minY - 0.5)
        XCTAssertLessThanOrEqual(fieldBottom, keyboard.minY - 8 + 0.5)
    }

    func testFloatingPadShiftsTheFormDownWithoutLeavingTheCard() {
        let viewport = CGRect(x: 143, y: 269, width: 443, height: 595)
        let field = CGRect(x: 0, y: 106, width: 443, height: 92)
        let strip = CGRect(x: 0, y: 988, width: 1376, height: 44)
        let shift = DonorKeyboardAvoidance.floatingPadClearance(
            fieldInContent: field,
            viewport: viewport,
            keyboard: strip,
            contentBottom: 409,
            coveredTop: 140
        )
        XCTAssertEqual(shift, -140, accuracy: 0.01)
        let addressBottom = viewport.minY + 409 - shift
        XCTAssertLessThanOrEqual(addressBottom, viewport.maxY - 8 + 0.5)
    }

    func testFloatingPadClearanceStopsWhenTheFormFillsTheCard() {
        let viewport = CGRect(x: 0, y: 200, width: 400, height: 500)
        let field = CGRect(x: 10, y: 40, width: 360, height: 70)
        let strip = CGRect(x: 0, y: 900, width: 1200, height: 44)
        let shift = DonorKeyboardAvoidance.floatingPadClearance(
            fieldInContent: field,
            viewport: viewport,
            keyboard: strip,
            contentBottom: 490,
            coveredTop: 140
        )
        XCTAssertEqual(shift, -2, accuracy: 0.01)
    }

    func testDockedKeyboardDoesNotUseTheFloatingPadShift() {
        let viewport = CGRect(x: 40, y: 160, width: 520, height: 640)
        let field = CGRect(x: 20, y: 80, width: 460, height: 72)
        let keyboard = CGRect(x: 0, y: 700, width: 1366, height: 320)
        XCTAssertEqual(
            DonorKeyboardAvoidance.floatingPadClearance(
                fieldInContent: field,
                viewport: viewport,
                keyboard: keyboard,
                contentBottom: 500,
                coveredTop: 140
            ),
            0
        )
    }

    func testAddressResponseGeneration() {
        XCTAssertEqual(DonorCheckoutRules.addressDebounceNanoseconds, 380_000_000)
        XCTAssertTrue(DonorCheckoutRules.shouldAcceptAddressResponse(generation: 2, expected: 2, query: "2101", current: "2101"))
        XCTAssertFalse(DonorCheckoutRules.shouldAcceptAddressResponse(generation: 1, expected: 2, query: "210", current: "2101"))
        XCTAssertFalse(DonorCheckoutRules.shouldAcceptAddressResponse(generation: 2, expected: 2, query: "210", current: "2101"))
    }
}
