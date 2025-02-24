import $ from "jquery";
import tippy, {delegate} from "tippy.js";

import * as message_lists from "./message_lists";
import * as reactions from "./reactions";
import * as rows from "./rows";
import * as timerender from "./timerender";

// We override the defaults set by tippy library here,
// so make sure to check this too after checking tippyjs
// documentation for default properties.
tippy.setDefaultProps({
    // We don't want tooltips
    // to take more space than
    // mobile widths ever.
    maxWidth: 300,

    // Some delay to showing / hiding the tooltip makes
    // it look less forced and more natural.
    delay: [100, 20],
    placement: "auto",

    // disable animations to make the
    // tooltips feel snappy
    animation: false,

    // Show tooltips on long press on touch based
    // devices.
    touch: ["hold", 750],

    // This has the side effect of some properties of parent applying to
    // tooltips.
    appendTo: "parent",

    // html content is not supported by default
    // enable it by passing data-tippy-allowHtml="true"
    // in the tag or a parameter.
});

export function initialize() {
    delegate("body", {
        // Add elements here which are not displayed on
        // initial load but are displayed later through
        // some means.
        //
        // Make all html elements having this class
        // show tippy styled tooltip on hover.
        target: ".tippy-zulip-tooltip",
    });

    // message reaction tooltip showing who reacted.
    let observer;
    delegate("body", {
        target: ".message_reaction, .message_reactions .reaction_button",
        placement: "bottom",
        onShow(instance) {
            const elem = $(instance.reference);
            if (!instance.reference.classList.contains("reaction_button")) {
                const local_id = elem.attr("data-reaction-id");
                const message_id = rows.get_message_id(instance.reference);
                const title = reactions.get_reaction_title_data(message_id, local_id);
                instance.setContent(title);
            }

            // Use MutationObserver to check for removal of nodes on which tooltips
            // are still active.
            // We target the message table and check for removal of it, it's children
            // and the reactions individually down in the subtree.
            const target_node = elem.parents(".message_table.focused_table").get(0);
            if (!target_node) {
                // The `reaction` was removed from DOM before we reached here.
                // In that case, we simply hide the tooltip.
                // We have to be smart about hiding the instance, so we hide it as soon
                // as it is displayed.
                setTimeout(instance.hide, 0);
                return;
            }

            const nodes_to_check_for_removal = [
                elem.parents(".recipient_row").get(0),
                elem.parents(".message_reactions").get(0),
                elem.get(0),
            ];
            const config = {attributes: false, childList: true, subtree: true};

            const callback = function (mutationsList) {
                for (const mutation of mutationsList) {
                    for (const node of nodes_to_check_for_removal) {
                        // Hide instance if reference is in the removed node list.
                        if (Array.prototype.includes.call(mutation.removedNodes, node)) {
                            instance.hide();
                        }
                    }
                }
            };
            observer = new MutationObserver(callback);
            observer.observe(target_node, config);
        },
        onHidden(instance) {
            instance.destroy();
            if (observer) {
                observer.disconnect();
            }
        },
        appendTo: () => document.body,
    });

    delegate("body", {
        target: ".compose_control_button",
        placement: "top",
        // Add some additional delay when they open
        // so that regular users don't have to see
        // them unless they want to.
        delay: [300, 20],
    });

    delegate("body", {
        target: ".message_control_button",
        placement: "top",
        // Add some additional delay when they open
        // so that regular users don't have to see
        // them unless they want to.
        delay: [300, 20],
        onShow(instance) {
            // Handle dynamic "starred messages" and "edit" widgets.
            const elem = $(instance.reference);
            let content = elem.attr("data-tippy-content");
            if (content === undefined) {
                // Tippy cannot get the content for message edit button
                // as it is dynamically inserted based on editability.
                // So, we have to manually get the i element to get the
                // content from it.
                //
                // TODO: Change the template structure so logic is unnecessary.
                const edit_button = elem.find("i.edit_content_button");
                content = edit_button.attr("data-tippy-content");
            }
            if (content === undefined) {
                // If content is still undefined it is because content
                // is specified on inner i tags and is handled by our
                // general tippy-zulip-tooltip class. So we return
                // false here to avoid showing an extra empty tooltip
                // for such cases.
                return false;
            }
            instance.setContent(content);
            return true;
        },
    });

    delegate("body", {
        target: ".message_time",
        allowHTML: true,
        placement: "top",
        appendTo: () => document.body,
        onShow(instance) {
            const time_elem = $(instance.reference);
            const row = time_elem.closest(".message_row");
            const message = message_lists.current.get(rows.id(row));
            const time = new Date(message.timestamp * 1000);
            const full_datetime = timerender.get_full_datetime(time);
            instance.setContent(full_datetime.date + "<br/>" + full_datetime.time);
        },
        onHidden(instance) {
            instance.destroy();
        },
    });

    delegate("body", {
        target: ".recipient_row_date > span",
        allowHTML: true,
        placement: "top",
        appendTo: () => document.body,
        onHidden(instance) {
            instance.destroy();
        },
    });
}
